-- Projekt-stadier: vil_gerne, i_gang, faerdigstrikket.
-- Eksisterende projekter backfilles til 'faerdigstrikket' (bagudkompatibelt med det tidligere Arkiv-koncept).
-- Defense-in-depth: is_shared=true kræver status='faerdigstrikket'.
--
-- Run i Supabase SQL Editor. Kør `notify pgrst, 'reload schema'` bagefter,
-- ellers kan PostgREST returnere 400 på select(..., status).

begin;

alter table public.projects
  add column if not exists status text not null default 'faerdigstrikket';

-- Eksplicit backfill (idempotent — beskytter mod tidligere partielle kørsler)
update public.projects
  set status = 'faerdigstrikket'
  where status is null;

alter table public.projects
  drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('vil_gerne','i_gang','faerdigstrikket'));

-- Invariant: deling kræver færdigstrikket
alter table public.projects
  drop constraint if exists projects_shared_requires_faerdig;
alter table public.projects
  add constraint projects_shared_requires_faerdig
  check (is_shared = false or status = 'faerdigstrikket');

create index if not exists projects_status_idx
  on public.projects (user_id, status);

-- Anon må læse status-kolonnen (nyttigt for fremtidige fællesskabs-filtre)
grant select (status) on public.projects to anon;

commit;

-- Tving PostgREST til at genindlæse schema-cache, ellers returnerer
-- select(..., status) 400 Bad Request indtil næste naturlige reload.
notify pgrst, 'reload schema';

