-- Fællesskabet: deling af færdige projekter.
-- Run i Supabase SQL Editor.
--
-- Tilføjer mulighed for at markere projects som "is_shared = true" og eksponerer dem
-- gennem offentligt læsbare views. Kritisk copyright-krav: "notes" og "pattern_pdf_url"
-- må ALDRIG lække til anon. Vi forsvarer det i tre lag:
--   1) View whitelister kolonner (ingen notes/pdf)
--   2) Kolonne-niveau GRANT på projects/yarn_usage for anon udelader notes/pdf
--   3) RLS-policy begrænser anon-adgang til rækker hvor is_shared = true
begin;

-- ── Projects: udvidelse ──────────────────────────────────────────────────────
alter table public.projects
  add column if not exists is_shared             boolean not null default false,
  add column if not exists shared_at             timestamptz null,
  add column if not exists project_type          text null,
  add column if not exists pattern_name          text null,
  add column if not exists pattern_designer      text null,
  add column if not exists community_description text null;

alter table public.projects
  drop constraint if exists projects_project_type_check;
alter table public.projects
  add constraint projects_project_type_check
  check (project_type is null or project_type in (
    'cardigan','sweater','top','hue','sjal',
    'stroemper','vest','troeje','toerklaede','taeppe','andet'
  ));

create index if not exists projects_is_shared_idx
  on public.projects (shared_at desc)
  where is_shared = true;

-- ── Profiles: valgfrit display_name per bruger ───────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Alle (anon + authenticated) kan læse profiler for brugere der har delt projekter.
-- Det tillader viewet at joine display_name ind.
drop policy if exists profiles_select_public_display on public.profiles;
create policy profiles_select_public_display
  on public.profiles for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.user_id = profiles.id and p.is_shared = true
    )
  );

-- ── RLS-policies: offentlig læsning af delte projekter ───────────────────────
drop policy if exists projects_select_shared_public on public.projects;
create policy projects_select_shared_public
  on public.projects for select
  to anon, authenticated
  using (is_shared = true);

drop policy if exists yarn_usage_select_shared_public on public.yarn_usage;
create policy yarn_usage_select_shared_public
  on public.yarn_usage for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = yarn_usage.project_id and p.is_shared = true
    )
  );

-- ── Kolonne-niveau GRANTs — anon må KUN se offentlige kolonner ───────────────
-- notes og pattern_pdf_url er BEVIDST udeladt.
revoke select on public.projects from anon;
grant select (
  id, user_id,
  title, used_at, needle_size, held_with,
  project_image_url,
  is_shared, shared_at, project_type,
  pattern_name, pattern_designer, community_description,
  created_at, updated_at
) on public.projects to anon;

revoke select on public.yarn_usage from anon;
grant select (
  id, project_id,
  yarn_name, yarn_brand,
  color_name, color_code, hex_color,
  catalog_yarn_id, catalog_color_id
) on public.yarn_usage to anon;

grant select (id, display_name) on public.profiles to anon;

-- ── Views: whitelister felter til offentlig visning ──────────────────────────
create or replace view public.public_shared_projects
with (security_invoker = true) as
select
  p.id,
  p.title,
  p.project_image_url,
  p.project_type,
  p.community_description,
  p.pattern_name,
  p.pattern_designer,
  p.shared_at,
  pr.display_name
from public.projects p
left join public.profiles pr on pr.id = p.user_id
where p.is_shared = true;

create or replace view public.public_shared_project_yarns
with (security_invoker = true) as
select
  yu.id,
  yu.project_id,
  yu.yarn_name,
  yu.yarn_brand,
  yu.color_name,
  yu.color_code,
  yu.hex_color,
  yu.catalog_yarn_id,
  yu.catalog_color_id
from public.yarn_usage yu
where exists (
  select 1 from public.projects p
  where p.id = yu.project_id and p.is_shared = true
);

grant select on public.public_shared_projects      to anon, authenticated;
grant select on public.public_shared_project_yarns to anon, authenticated;

commit;
