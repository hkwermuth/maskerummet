-- Projects table + link yarn_usage to projects via project_id.
-- Run in Supabase SQL Editor.
--
-- This enables "Færdige projekter" to have multiple yarn lines per project and
-- show yarn thumbnails/swatches per project.

begin;

-- ── Projects ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text null,
  used_at date null,
  needle_size text null,
  held_with text null,
  notes text null,

  project_image_url text null,
  pattern_pdf_url text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_used_at_idx on public.projects (used_at);

-- Keep updated_at fresh (function may already exist).
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at
before update on public.projects
for each row execute function public.tg_set_updated_at();

alter table public.projects enable row level security;

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
on public.projects for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
on public.projects for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
on public.projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own
on public.projects for delete
to authenticated
using (auth.uid() = user_id);

-- ── yarn_usage: add project_id ──────────────────────────────────────────────
alter table public.yarn_usage
  add column if not exists project_id uuid;

alter table public.yarn_usage
  drop constraint if exists yarn_usage_project_id_fkey,
  add constraint yarn_usage_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete cascade;

create index if not exists yarn_usage_project_id_idx
  on public.yarn_usage (project_id);

commit;

