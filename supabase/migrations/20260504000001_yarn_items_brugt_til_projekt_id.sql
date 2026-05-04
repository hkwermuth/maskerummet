-- F16 — Bidirektional kobling fra yarn_items til projects.
-- Tilføjer parallel UUID-kolonne ved siden af eksisterende fri-tekst-feltet
-- brugt_til_projekt (fra 20260428000002). Bruges af cascade-flow til at finde
-- "hvor er dette garn i brug" uden join via yarn_usage, og af de-cascade-
-- flowet til at revertere status uden at miste reference til projektet.
--
-- Kør i Supabase SQL Editor. Idempotent: kan genkøres uden datatab.

begin;

alter table public.yarn_items
  add column if not exists brugt_til_projekt_id uuid null;

alter table public.yarn_items
  drop constraint if exists yarn_items_brugt_til_projekt_id_fkey,
  add constraint yarn_items_brugt_til_projekt_id_fkey
    foreign key (brugt_til_projekt_id) references public.projects (id) on delete set null;

create index if not exists yarn_items_brugt_til_projekt_id_idx
  on public.yarn_items (brugt_til_projekt_id);

comment on column public.yarn_items.brugt_til_projekt_id is
  'UUID-reference til projects-tabellen. Bruges af cascade/de-cascade-flow når et projekt afsluttes eller revertes. Eksisterer parallelt med fri-tekst-feltet brugt_til_projekt.';

-- RLS arves automatisk fra eksisterende user_id-baserede policies
-- (yarn_items_select/insert/update/delete_own fra 20260419000001).
-- Table-level GRANT til authenticated er allerede på plads og dækker
-- nye kolonner automatisk.

commit;

-- Tving PostgREST til at genindlæse schema-cache.
notify pgrst, 'reload schema';
