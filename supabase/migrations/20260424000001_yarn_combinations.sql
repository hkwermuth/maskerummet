-- Held-together yarn combinations (kuraterede par der strikkes sammen).
-- Eksempel: 1× Sandnes Tynn Merinoull + 1× Sandnes Tynn Silk Mohair → pind 6.
-- Kun editorer kan oprette/ændre. Alle (anon + authenticated) kan læse.

begin;

create table if not exists public.yarn_combinations (
  id uuid primary key default gen_random_uuid(),
  yarn_id_a uuid not null references public.yarns(id) on delete cascade,
  yarn_id_b uuid not null references public.yarns(id) on delete cascade,

  -- Effektiv specifikation når garnerne strikkes sammen.
  combined_needle_min_mm numeric(3,1),
  combined_needle_max_mm numeric(3,1),
  combined_gauge_stitches_10cm numeric(4,1),
  combined_thickness_category text check (
    combined_thickness_category is null
    or combined_thickness_category in ('lace','fingering','sport','dk','aran','worsted','bulky','unspun')
  ),

  use_cases text[] not null default '{}',
  notes text check (notes is null or length(btrim(notes)) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Stable canonical ordering så (a,b) ikke kan duplikeres som (b,a).
  -- yarn_id_a <= yarn_id_b tillader 2× samme garn (fx 2× Drops Flora).
  constraint yarn_combinations_pair_canonical check (yarn_id_a <= yarn_id_b)
);

create unique index if not exists yarn_combinations_unique_pair
  on public.yarn_combinations (yarn_id_a, yarn_id_b);

create index if not exists yarn_combinations_yarn_a_idx
  on public.yarn_combinations (yarn_id_a);

create index if not exists yarn_combinations_yarn_b_idx
  on public.yarn_combinations (yarn_id_b);

drop trigger if exists set_updated_at on public.yarn_combinations;
create trigger set_updated_at
before update on public.yarn_combinations
for each row execute function public.tg_set_updated_at();

alter table public.yarn_combinations enable row level security;

drop policy if exists yarn_combinations_select on public.yarn_combinations;
create policy yarn_combinations_select
on public.yarn_combinations for select
to anon, authenticated
using (true);

drop policy if exists yarn_combinations_editor_all on public.yarn_combinations;
create policy yarn_combinations_editor_all
on public.yarn_combinations for all
to authenticated
using (public.is_editor())
with check (public.is_editor());

-- PostgREST kræver eksplicit GRANT ud over RLS-policies.
grant select on public.yarn_combinations to anon, authenticated;
grant insert, update, delete on public.yarn_combinations to authenticated;

commit;
