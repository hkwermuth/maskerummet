-- Definerer public.is_editor() — bruges af RLS-policies i flere tidligere migrations
-- (substitution_community, yarn_combinations, m.fl.). Funktionen eksisterede oprindeligt
-- kun i prod (oprettet via Studio UI) — denne migration porterer den ind i repo'et,
-- så fresh-DB replays ikke fejler med "function public.is_editor() does not exist".
--
-- Forudsætter at tabellen public.user_profiles eksisterer med kolonnerne id (uuid)
-- og role (text). Den ligger i base_schema (manglende fil — se README.md "Bootstrap-gap").
--
-- CREATE OR REPLACE er sikker mod prod (samme definition som allerede deployed pr. 2026-04-25,
-- verificeret via pg_get_functiondef).

begin;

create or replace function public.is_editor()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('editor','admin')
  );
$$;

commit;
