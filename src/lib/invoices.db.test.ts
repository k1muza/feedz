import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { promisify } from 'node:util';

// Runs the real Supabase migrations in a throwaway Postgres cluster and checks
// the guarantees invoice creation relies on: concurrency-safe numbering,
// unique idempotency keys and admin-only row-level security. Needs Postgres
// server binaries (initdb, pg_ctl, psql): set FEEDSPORT_TEST_PG_BIN to their
// directory, or have them on PATH or in /usr/lib/postgresql/<version>/bin.
// Skipped when none are found. Never points at a configured database.

const run = promisify(execFile);

const SEARCH = [
  process.env.FEEDSPORT_TEST_PG_BIN,
  ...(existsSync('/usr/lib/postgresql') ? readdirSync('/usr/lib/postgresql').sort().reverse().map((v) => `/usr/lib/postgresql/${v}/bin`) : []),
  ...(process.env.PATH ?? '').split(path.delimiter),
].filter((dir): dir is string => Boolean(dir));
const findBin = (...names: string[]) => SEARCH.find((dir) => names.every((name) => existsSync(path.join(dir, name)))) ?? null;

const PG_SERVER_BIN = findBin('initdb', 'pg_ctl');
const PSQL_BIN = findBin('psql');
const PG_BIN = PG_SERVER_BIN && PSQL_BIN;
const MIGRATIONS = path.join(process.cwd(), 'supabase/migrations');
const ADMIN = '00000000-0000-4000-a000-000000000001';
const FARMER = '00000000-0000-4000-a000-000000000002';

// The parts of Supabase the migrations expect: API roles, and auth.uid() and auth.jwt() from the request JWT.
const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true), current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

describe('invoice database guarantees', { skip: PG_BIN ? false : 'no Postgres server binaries (set FEEDSPORT_TEST_PG_BIN)' }, () => {
  let dir = '';
  const port = String(20_000 + Math.floor(Math.random() * 20_000));
  const bin = (name: string) => path.join(name === 'psql' ? PSQL_BIN! : PG_SERVER_BIN!, name);

  async function psql(sql: string) {
    const { stdout } = await run(bin('psql'), ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-h', dir, '-p', port, '-U', 'postgres', '-d', 'postgres', '-c', sql]);
    return stdout.trim();
  }

  /** Runs sql in a transaction as the API role, with the given user's JWT claims. */
  const as = (userId: string | null, sql: string) =>
    psql(`begin;
      set local role ${userId ? 'authenticated' : 'anon'};
      select set_config('request.jwt.claims', '${JSON.stringify(userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' })}', true);
      ${sql}
      commit;`).then((out) => out.split('\n').filter((line) => line && !line.startsWith('{')));

  const insert = (issueDate: string, key?: string, extra = '') =>
    `insert into public.invoices (issue_date, due_date, client, items, subtotal, total_amount${key ? ', idempotency_key, idempotency_hash' : ''})
     values ('${issueDate}', '${issueDate}'::date + 30, '{"name":"ABC Farms"}', '[{"id":"1","description":"Wheat bran","quantity":1,"price":1}]', 1, 1${key ? `, '${key}', 'h'` : ''})
     returning invoice_number; ${extra}`;

  before(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'feedsport-pg-'));
    const data = path.join(dir, 'data');
    await run(bin('initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--no-sync']);
    await run(bin('pg_ctl'), ['-D', data, '-l', path.join(dir, 'log'), '-w', '-o', `-k ${dir} -p ${port} -c listen_addresses='' -c fsync=off`, 'start']);
    await psql(SUPABASE_STUB);
    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
      const sql = await readFile(path.join(MIGRATIONS, file), 'utf8');
      await psql(sql).catch((error) => {
        throw new Error(`Migration ${file} failed: ${error.stderr ?? error.message}`);
      });
    }
    await psql(`insert into auth.users values ('${ADMIN}', 'admin@feedsport.test'), ('${FARMER}', 'farmer@example.com');
      insert into public.admin_users (user_id, email) values ('${ADMIN}', 'admin@feedsport.test');`);
  });

  after(async () => {
    if (!dir) return;
    await run(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-m', 'immediate', 'stop']).catch(() => {});
    await rm(dir, { recursive: true, force: true });
  });

  it('numbers invoices created concurrently on separate connections without gaps or collisions', async () => {
    // Each insert holds its transaction open briefly, so the inserts overlap.
    const numbers = await Promise.all(Array.from({ length: 12 }, () => as(ADMIN, insert('2026-10-16', undefined, 'select pg_sleep(0.05);'))));
    const assigned = numbers.map((rows) => rows.find((row) => row.startsWith('INV-'))).sort();
    assert.deepEqual(assigned, Array.from({ length: 12 }, (_, i) => `INV-20261016-${String(i + 1).padStart(2, '0')}`));
    assert.deepEqual(await as(ADMIN, insert('2026-10-17')), ['INV-20261017-01'], 'numbering restarts for each issue date');
  });

  it('renumbers an invoice whose issue date moves, and keeps the number otherwise', async () => {
    const [moved] = await as(ADMIN, `update public.invoices set issue_date = '2026-10-17', due_date = '2026-11-30' where invoice_number = 'INV-20261016-12' returning invoice_number;`);
    assert.equal(moved, 'INV-20261017-02');
    const [kept] = await as(ADMIN, `update public.invoices set status = 'sent' where invoice_number = 'INV-20261017-02' returning invoice_number;`);
    assert.equal(kept, 'INV-20261017-02');
  });

  it('allows one invoice per idempotency key, even when retries race', async () => {
    const attempts = await Promise.allSettled(Array.from({ length: 4 }, () => as(ADMIN, insert('2026-10-18', `${ADMIN}:retry-key-1`, 'select pg_sleep(0.05);'))));
    assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
    for (const failed of attempts.filter((a): a is PromiseRejectedResult => a.status === 'rejected')) {
      // The MCP store recognises this error and returns the invoice that holds the key.
      assert.match(String(failed.reason.stderr), /duplicate key value violates unique constraint "invoices_idempotency_key_idx"/);
    }
    assert.equal(await psql(`select count(*) from public.invoices where idempotency_key = '${ADMIN}:retry-key-1'`), '1');
  });

  it('still saves web app invoices without an idempotency key, and records who created each invoice', async () => {
    const [number] = await as(ADMIN, insert('2026-10-19'));
    assert.equal(number, 'INV-20261019-01');
    assert.equal(await psql(`select created_by from public.invoices where invoice_number = '${number}'`), ADMIN);
    await assert.rejects(as(ADMIN, insert('2026-10-19', 'key-without-hash').replace(", 'h')", ", null)")), /check constraint/, 'a key needs its request hash');
  });

  it('keeps invoices to admins: other users and anonymous clients can neither read nor write them', async () => {
    assert.ok(Number((await as(ADMIN, 'select count(*) from public.invoices;'))[0]) > 0);
    assert.deepEqual(await as(FARMER, 'select count(*) from public.invoices;'), ['0']);
    await assert.rejects(as(FARMER, insert('2026-10-20')), /row-level security/);
    assert.deepEqual(await as(FARMER, `update public.invoices set total_amount = 0 returning id;`), []);
    const anonymous = await as(null, 'select count(*) from public.invoices;').catch((error) => String(error.stderr));
    assert.ok(/permission denied/.test(String(anonymous)) || String(anonymous) === '0', `anonymous clients see no invoices (got ${anonymous})`);
    await assert.rejects(as(null, insert('2026-10-20')), /row-level security|permission denied/);
  });
});
