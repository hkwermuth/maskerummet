-- Community enrichment for yarn substitutions (votes + suggestions).
-- Run in Supabase SQL Editor.

begin;

-- ── Votes: user validation + optional comment ────────────────────────────────
create table if not exists public.substitution_votes (
  id uuid primary key default gen_random_uuid(),
  target_yarn_id uuid not null references public.yarns(id) on delete cascade,
  candidate_yarn_id uuid not null references public.yarns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verdict text not null check (verdict in ('perfekt','god','forbehold','virker_ikke')),
  comment text null check (comment is null or length(btrim(comment)) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists substitution_votes_unique_user_pair
  on public.substitution_votes (target_yarn_id, candidate_yarn_id, user_id);

create index if not exists substitution_votes_target_candidate_idx
  on public.substitution_votes (target_yarn_id, candidate_yarn_id);

-- Keep updated_at fresh.
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.substitution_votes;
create trigger set_updated_at
before update on public.substitution_votes
for each row execute function public.tg_set_updated_at();

alter table public.substitution_votes enable row level security;

-- Anyone can read votes/comments (public transparency).
drop policy if exists substitution_votes_select on public.substitution_votes;
create policy substitution_votes_select
on public.substitution_votes for select
to anon, authenticated
using (true);

-- Authenticated users can vote.
drop policy if exists substitution_votes_insert on public.substitution_votes;
create policy substitution_votes_insert
on public.substitution_votes for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can update/delete their own vote.
drop policy if exists substitution_votes_update_own on public.substitution_votes;
create policy substitution_votes_update_own
on public.substitution_votes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists substitution_votes_delete_own on public.substitution_votes;
create policy substitution_votes_delete_own
on public.substitution_votes for delete
to authenticated
using (auth.uid() = user_id);

-- ── Suggestions: catalog + external (moderated) ─────────────────────────────
create table if not exists public.substitution_suggestions (
  id uuid primary key default gen_random_uuid(),
  target_yarn_id uuid not null references public.yarns(id) on delete cascade,

  -- catalog suggestion (existing yarn)
  suggested_yarn_id uuid null references public.yarns(id) on delete set null,

  -- external suggestion (not yet in catalog)
  suggested_producer text null,
  suggested_name text null,
  suggested_series text null,
  suggested_url text null,
  suggested_specs jsonb null,

  suggestion_type text not null check (suggestion_type in ('catalog','external')),
  status text not null check (status in ('new','approved','rejected')),

  user_id uuid not null references auth.users(id) on delete cascade,
  comment text null check (comment is null or length(btrim(comment)) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Consistency constraints
  constraint substitution_suggestions_catalog_requires_yarn
    check (suggestion_type <> 'catalog' or suggested_yarn_id is not null),
  constraint substitution_suggestions_external_requires_fields
    check (
      suggestion_type <> 'external'
      or (
        suggested_yarn_id is null
        and suggested_producer is not null
        and suggested_name is not null
        and suggested_url is not null
      )
    )
);

create index if not exists substitution_suggestions_target_idx
  on public.substitution_suggestions (target_yarn_id);

create index if not exists substitution_suggestions_status_idx
  on public.substitution_suggestions (status);

drop trigger if exists set_updated_at on public.substitution_suggestions;
create trigger set_updated_at
before update on public.substitution_suggestions
for each row execute function public.tg_set_updated_at();

alter table public.substitution_suggestions enable row level security;

-- SELECT:
-- - Everyone can see approved suggestions
-- - Auth users can see their own suggestions (incl. pending)
-- - Editors can see all
drop policy if exists substitution_suggestions_select on public.substitution_suggestions;
create policy substitution_suggestions_select
on public.substitution_suggestions for select
to anon, authenticated
using (
  status = 'approved'
  or user_id = auth.uid()
  or public.is_editor()
);

-- INSERT:
-- - Auth users can suggest catalog yarns immediately (approved)
-- - External suggestions must be status=new
drop policy if exists substitution_suggestions_insert on public.substitution_suggestions;
create policy substitution_suggestions_insert
on public.substitution_suggestions for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    (suggestion_type = 'catalog' and status = 'approved')
    or (suggestion_type = 'external' and status = 'new')
  )
);

-- UPDATE:
-- - Editors can moderate status
-- Note: we intentionally do NOT allow regular users to update suggestions
-- (including comments). They can delete and resubmit instead.

drop policy if exists substitution_suggestions_moderate_status on public.substitution_suggestions;
create policy substitution_suggestions_moderate_status
on public.substitution_suggestions for update
to authenticated
using (public.is_editor())
with check (public.is_editor());

drop policy if exists substitution_suggestions_delete_own on public.substitution_suggestions;
create policy substitution_suggestions_delete_own
on public.substitution_suggestions for delete
to authenticated
using (auth.uid() = user_id or public.is_editor());

-- PostgREST kræver eksplicit GRANT ud over RLS-policies.
grant select on public.substitution_votes to anon, authenticated;
grant insert, update, delete on public.substitution_votes to authenticated;
grant select on public.substitution_suggestions to anon, authenticated;
grant insert, update, delete on public.substitution_suggestions to authenticated;

commit;

