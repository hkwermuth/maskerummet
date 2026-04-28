-- Fællesskabet — Runde 3 af tilretninger:
--  1) Bruger kan vælge hvilket project_image_url der vises som hovedbillede
--     på Fællesskabet (community_primary_image_index, default 0).
--  2) Detail-pop-up på Fællesskabet skal kunne vise opskriftens forside.
--     Bryder bevidst copyright-mur for forside-billede:
--       - pattern_pdf_thumbnail_url eksponeres til anon (lille thumb af PDF side 1)
--       - pattern_image_urls[1] (første billede, Postgres er 1-indexeret) eksponeres
--         som computed view-kolonne pattern_cover_url. Hele arrayet forbliver
--         beskyttet bag kolonne-GRANT.
--
-- Run i Supabase SQL Editor.
begin;

-- ── 1) Ny kolonne: primær billede-index ──────────────────────────────────────
alter table public.projects
  add column if not exists community_primary_image_index integer null default 0;

-- Bevidst INGEN øvre CHECK: hvis brugeren senere sletter billeder kunne en
-- streng constraint bryde. UI'et fallbacker til index 0 hvis værdien peger
-- uden for arrayet.
alter table public.projects
  drop constraint if exists projects_community_primary_image_index_nonneg;
alter table public.projects
  add  constraint projects_community_primary_image_index_nonneg
       check (community_primary_image_index is null or community_primary_image_index >= 0);

-- ── 2) Genapplikér kolonne-niveau GRANT til anon med nye felter ──────────────
-- pattern_pdf_thumbnail_url tilføjes BEVIDST — det er lille forside-thumb,
-- ikke selve mønsterskema.
-- pattern_image_urls forbliver UDEladt — vi giver kun forsiden (1-indexeret
-- pattern_image_urls[1]) via computed view-kolonne pattern_cover_url nedenfor.
revoke select on public.projects from anon;
grant select (
  id, user_id,
  title, used_at, needle_size, held_with,
  project_image_urls,
  is_shared, shared_at, project_type,
  pattern_name, pattern_designer, community_description,
  community_size_shown,
  community_primary_image_index,
  pattern_pdf_thumbnail_url,
  status,
  created_at, updated_at
) on public.projects to anon;

-- ── 3) Genskab public_shared_projects med tre nye felter ────────────────────
-- security_invoker = false (security definer): viewet kører med ejer-privilegier
-- så anon kan læse kolonner som vi BEVIDST IKKE har givet GRANT på til anon
-- (pattern_image_urls). WHERE-klausulen sikrer at kun delte projekter returneres,
-- så copyright-beskyttelsen bevares — vi eksponerer KUN forsiden via det
-- computed felt pattern_cover_url, ikke hele opskrifts-arrayet.
drop view if exists public.public_shared_projects;
create view public.public_shared_projects
with (security_invoker = false) as
select
  p.id,
  p.title,
  p.project_image_urls,
  p.community_primary_image_index,
  p.project_type,
  p.community_description,
  p.community_size_shown,
  p.pattern_name,
  p.pattern_designer,
  p.pattern_pdf_thumbnail_url,
  p.pattern_image_urls[1] as pattern_cover_url,  -- 1-indexeret: kun forsiden
  p.shared_at,
  pr.display_name
from public.projects p
left join public.profiles pr on pr.id = p.user_id
where p.is_shared = true;

grant select on public.public_shared_projects to anon, authenticated;

commit;
