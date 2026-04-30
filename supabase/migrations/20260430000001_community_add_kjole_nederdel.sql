-- Fællesskabet — udvid project_type med 'nederdel' og 'kjole'.
--
-- Run i Supabase SQL Editor.
begin;

-- ── Udvid project_type CHECK-constraint ─────────────────────────────────────
alter table public.projects
  drop constraint if exists projects_project_type_check;
alter table public.projects
  add constraint projects_project_type_check
  check (project_type is null or project_type in (
    'cardigan','sweater','top','hue','sjal',
    'stroemper','vest','troeje','toerklaede','taeppe',
    'bluse','sommerbluse','babytoej','boernetoej',
    'nederdel','kjole',
    'andet'
  ));

commit;
