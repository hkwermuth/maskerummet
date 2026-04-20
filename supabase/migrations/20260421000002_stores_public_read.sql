-- Stores: offentlig læsning + RLS-hegn.
--
-- Tabellen stores eksisterer i forvejen (228 butikker pr. 2026-04-20), men der
-- var ingen migration i repo'et der dokumenterer dens RLS-opsætning. Denne
-- migration er idempotent og sikrer:
--   1. RLS er aktiveret (hvis ikke allerede)
--   2. Offentlig SELECT-policy eksisterer — alle (anon + authenticated) kan se
--      butiksdata, da det er offentlig information om hvor man kan købe garn.
--   3. Ingen INSERT/UPDATE/DELETE-policies for anon/authenticated — kun
--      service_role kan ændre (via admin-scripts).
--
-- Kør i Supabase SQL Editor (eller via `supabase db push`).

begin;

alter table if exists public.stores enable row level security;

drop policy if exists stores_public_read on public.stores;
create policy stores_public_read
  on public.stores for select
  to anon, authenticated
  using (true);

commit;
