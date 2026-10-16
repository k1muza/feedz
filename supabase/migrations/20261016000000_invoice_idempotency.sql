-- Idempotent invoice creation for the advisor MCP endpoint. A client that
-- retries create_invoice with the same idempotency key gets the invoice it
-- already created instead of a duplicate. The key is namespaced by the user
-- who created the invoice; the hash records the request it was first used for,
-- so a key reused for a different invoice is refused. Invoices created in the
-- admin web app leave both columns null.

alter table public.invoices
  add column idempotency_key text check (char_length(idempotency_key) between 1 and 200),
  add column idempotency_hash text check (char_length(idempotency_hash) between 1 and 128),
  add check ((idempotency_key is null) = (idempotency_hash is null));

create unique index invoices_idempotency_key_idx on public.invoices (idempotency_key) where idempotency_key is not null;
