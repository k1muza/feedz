import assert from "node:assert/strict";
import { test } from "node:test";

import { createClient } from "@supabase/supabase-js";

const url = process.env.FEEDZ_TEST_SUPABASE_URL;
const anonKey = process.env.FEEDZ_TEST_SUPABASE_ANON_KEY;
const email = process.env.FEEDZ_TEST_USER_EMAIL;
const password = process.env.FEEDZ_TEST_USER_PASSWORD;
const enabled = !!(url && anonKey && email && password);

test("two browser sessions can change the default list concurrently", { skip: !enabled }, async () => {
  const tabA = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const tabB = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const [authA, authB] = await Promise.all([
    tabA.auth.signInWithPassword({ email: email!, password: password! }),
    tabB.auth.signInWithPassword({ email: email!, password: password! }),
  ]);
  assert.equal(authA.error, null);
  assert.equal(authB.error, null);

  const marker = `concurrency-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const created = await tabA
    .from("ingredient_lists")
    .insert([{ label: marker + "-a" }, { label: marker + "-b" }])
    .select("id");
  assert.equal(created.error, null);
  assert.equal(created.data?.length, 2);
  const ids = created.data!.map((row) => row.id as string);

  try {
    const [resultA, resultB] = await Promise.all([
      tabA.rpc("set_default_ingredient_list", { p_list_id: ids[0] }),
      tabB.rpc("set_default_ingredient_list", { p_list_id: ids[1] }),
    ]);
    assert.equal(resultA.error, null);
    assert.equal(resultB.error, null);

    const lists = await tabA.from("ingredient_lists").select("id, is_default");
    assert.equal(lists.error, null);
    const defaults = (lists.data ?? []).filter((row) => row.is_default);
    assert.equal(defaults.length, 1, "the owner must have exactly one default after both commits");
    assert.ok(ids.includes(defaults[0].id as string), "the final default is one of the concurrent choices");
  } finally {
    await tabA.from("ingredient_lists").delete().in("id", ids);
  }
});
