-- Fællesskabet — Runde 2 af tilretninger:
--  1) Fire nye projekttyper (bluse, sommerbluse, babytoej, boernetoej)
--  2) Valgfrit "Vist i str."-felt på delte projekter (community_size_shown)
--
-- Run i Supabase SQL Editor.
begin;

-- ── 1) Udvid project_type CHECK-constraint med fire nye keys ─────────────────
alter table public.projects
  drop constraint if exists projects_project_type_check;
alter table public.projects
  add constraint projects_project_type_check
  check (project_type is null or project_type in (
    'cardigan','sweater','top','hue','sjal',
    'stroemper','vest','troeje','toerklaede','taeppe',
    'bluse','sommerbluse','babytoej','boernetoej',
    'andet'
  ));

-- ── 2) Ny nullable kolonne: opskriftens viste størrelse ─────────────────────
alter table public.projects
  add column if not exists community_size_shown text null;

-- ── 3) Genapplikér kolonne-niveau GRANT til anon med den nye kolonne ────────
-- pattern_pdf_url, pattern_image_urls, pattern_pdf_thumbnail_url, notes er BEVIDST udeladt.
revoke select on public.projects from anon;
grant select (
  id, user_id,
  title, used_at, needle_size, held_with,
  project_image_urls,
  is_shared, shared_at, project_type,
  pattern_name, pattern_designer, community_description,
  community_size_shown,
  status,
  created_at, updated_at
) on public.projects to anon;

-- ── 4) Genskab public_shared_projects med det nye felt ──────────────────────
drop view if exists public.public_shared_projects;
create view public.public_shared_projects
with (security_invoker = true) as
select
  p.id,
  p.title,
  p.project_image_urls,
  p.project_type,
  p.community_description,
  p.community_size_shown,
  p.pattern_name,
  p.pattern_designer,
  p.shared_at,
  pr.display_name
from public.projects p
left join public.profiles pr on pr.id = p.user_id
where p.is_shared = true;

grant select on public.public_shared_projects to anon, authenticated;

commit;
