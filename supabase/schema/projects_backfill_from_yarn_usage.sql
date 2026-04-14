-- Backfill existing yarn_usage rows into projects + set yarn_usage.project_id.
-- Run AFTER projects_and_usage_project_id.sql.
--
-- Heuristic grouping:
-- - Same user_id + used_for + used_at + (project_image_url) + (pattern_pdf_url) + (needle_size) + (held_with) + (notes)
-- creates one project.
--
-- This keeps existing user data and makes old rows appear in the new UI.

begin;

-- Only backfill rows that don't already have a project_id.
with groups as (
  select
    yu.user_id,
    yu.used_for,
    yu.used_at,
    yu.needle_size,
    yu.held_with,
    yu.notes,
    yu.project_image_url,
    yu.pattern_pdf_url,
    min(yu.created_at) as first_created_at
  from public.yarn_usage yu
  where yu.project_id is null
  group by
    yu.user_id,
    yu.used_for,
    yu.used_at,
    yu.needle_size,
    yu.held_with,
    yu.notes,
    yu.project_image_url,
    yu.pattern_pdf_url
),
ins as (
  insert into public.projects (
    user_id,
    title,
    used_at,
    needle_size,
    held_with,
    notes,
    project_image_url,
    pattern_pdf_url,
    created_at
  )
  select
    g.user_id,
    g.used_for,
    g.used_at,
    g.needle_size,
    g.held_with,
    g.notes,
    g.project_image_url,
    g.pattern_pdf_url,
    g.first_created_at
  from groups g
  returning id, user_id, title, used_at, needle_size, held_with, notes, project_image_url, pattern_pdf_url
)
update public.yarn_usage yu
set project_id = ins.id
from ins
where yu.project_id is null
  and yu.user_id = ins.user_id
  and (yu.used_for is not distinct from ins.title)
  and (yu.used_at is not distinct from ins.used_at)
  and (yu.needle_size is not distinct from ins.needle_size)
  and (yu.held_with is not distinct from ins.held_with)
  and (yu.notes is not distinct from ins.notes)
  and (yu.project_image_url is not distinct from ins.project_image_url)
  and (yu.pattern_pdf_url is not distinct from ins.pattern_pdf_url);

commit;

