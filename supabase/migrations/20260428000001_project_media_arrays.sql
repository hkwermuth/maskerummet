-- Multi-billed-upload til projekter.
-- Erstat skalaren project_image_url med et array (op til 6),
-- tilføj pattern_image_urls (op til 10) og pattern_pdf_thumbnail_url.
-- Bevar pattern_pdf_url; XOR mellem PDF og billed-opskrift håndhæves i CHECK.
-- Bevar copyright-mur: kun project_image_urls eksponeres til anon, IKKE pattern_*.
--
-- Run i Supabase SQL Editor.
begin;

-- ── 1. Nye kolonner ─────────────────────────────────────────────────────────
alter table public.projects
  add column if not exists project_image_urls       text[] not null default '{}',
  add column if not exists pattern_image_urls       text[] not null default '{}',
  add column if not exists pattern_pdf_thumbnail_url text null;

-- ── 2. CHECK-constraints ────────────────────────────────────────────────────
-- array_length('{}'::text[], 1) returnerer NULL → tomt array passerer altid.
-- array_length(NULL, 1) returnerer NULL ditto.
alter table public.projects
  drop constraint if exists projects_project_image_count_check;
alter table public.projects
  add constraint projects_project_image_count_check
    check (array_length(project_image_urls, 1) is null or array_length(project_image_urls, 1) <= 6);

alter table public.projects
  drop constraint if exists projects_pattern_image_count_check;
alter table public.projects
  add constraint projects_pattern_image_count_check
    check (array_length(pattern_image_urls, 1) is null or array_length(pattern_image_urls, 1) <= 10);

-- XOR: opskrift kan være PDF, eller billeder, eller ingenting — ikke begge.
alter table public.projects
  drop constraint if exists projects_pattern_xor_check;
alter table public.projects
  add constraint projects_pattern_xor_check
    check (pattern_pdf_url is null or array_length(pattern_image_urls, 1) is null);

-- ── 3. Backfill fra gammelt skalar-felt ─────────────────────────────────────
update public.projects
   set project_image_urls = array[project_image_url]
 where project_image_url is not null
   and project_image_urls = '{}'::text[];

-- ── 4. Drop view der peger på gamle kolonne (genskabes i trin 6) ────────────
-- CREATE OR REPLACE VIEW kan ikke ændre kolonne-type/navn, så vi dropper
-- viewet eksplicit før vi fjerner kolonnen og skriver den nye definition.
drop view if exists public.public_shared_projects;

-- ── 5. Drop gammel kolonne ──────────────────────────────────────────────────
alter table public.projects
  drop column if exists project_image_url;

-- ── 6. Kolonne-niveau GRANT til anon — udskift project_image_url med arrayet
-- pattern_pdf_url, pattern_image_urls, pattern_pdf_thumbnail_url er BEVIDST udeladt.
revoke select on public.projects from anon;
grant select (
  id, user_id,
  title, used_at, needle_size, held_with,
  project_image_urls,
  is_shared, shared_at, project_type,
  pattern_name, pattern_designer, community_description,
  status,
  created_at, updated_at
) on public.projects to anon;

-- ── 7. Genskab view: eksponer arrayet i stedet for skalar-feltet ────────────
create view public.public_shared_projects
with (security_invoker = true) as
select
  p.id,
  p.title,
  p.project_image_urls,
  p.project_type,
  p.community_description,
  p.pattern_name,
  p.pattern_designer,
  p.shared_at,
  pr.display_name
from public.projects p
left join public.profiles pr on pr.id = p.user_id
where p.is_shared = true;

grant select on public.public_shared_projects to anon, authenticated;

commit;
