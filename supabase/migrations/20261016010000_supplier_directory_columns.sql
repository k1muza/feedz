-- Supplier directory fields: extra phone numbers, how well the supplier is verified, and where the record came from.

alter table public.suppliers
  add column phone_2 text not null default '' check (char_length(phone_2) <= 60),
  add column phone_3 text not null default '' check (char_length(phone_3) <= 60),
  -- null = not assessed. verified: official or strongly corroborated pages; corroborated: strong but partly
  -- third-party evidence; unverified: prospecting lead to check by phone before any payment.
  add column verification text check (verification in ('verified', 'corroborated', 'unverified')),
  add column source text not null default '' check (char_length(source) <= 200);
