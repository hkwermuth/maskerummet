-- F5 fra brief 2026-04-27 — "Brugt op"-subflow på Mit Garnlager.
-- Tilføjer to felter til yarn_items så brugeren kan registrere
-- hvilket projekt et garn blev brugt til, og hvornår det blev brugt op.
--
-- brugt_til_projekt er fri tekst i denne første iteration.
-- Det er bevidst valgt så F15 (bidirektional kobling) senere kan
-- tilføje en parallel brugt_til_projekt_id UUID-kolonne uden
-- breaking changes på eksisterende fri-tekst-data.
--
-- Kør i Supabase SQL Editor. Idempotent: kan genkøres uden datatab.

begin;

alter table public.yarn_items
  add column if not exists brugt_til_projekt text null;

alter table public.yarn_items
  add column if not exists brugt_op_dato date null;

comment on column public.yarn_items.brugt_til_projekt is
  'Fri tekst med navn på projekt garnet blev brugt til. F15 vil tilføje parallel brugt_til_projekt_id UUID som relation til projects-tabellen.';

comment on column public.yarn_items.brugt_op_dato is
  'Dato hvor garnet blev markeret som "Brugt op". NULL hvis ikke registreret.';

-- RLS: arves automatisk fra eksisterende yarn_items-policies (select/insert/update/delete_own).
-- Ingen ny policy nødvendig.

-- Table-level GRANT er allerede på plads for authenticated.
-- Nye kolonner dækkes automatisk. Verificeret mod 20260419000001_rls_yarn_items_and_usage.sql.

commit;

-- Tving PostgREST til at genindlæse schema-cache så select(..., brugt_til_projekt, brugt_op_dato) virker.
notify pgrst, 'reload schema';
