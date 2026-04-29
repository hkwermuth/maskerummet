-- Saved recipes (favoritter) per bruger.
-- Bruger gemmer DROPS-mønstre (og senere mønstre fra andre kilder) ved at klikke
-- hjertet på /opskrifter. Mønstre lever ikke i DB — kun bogmærket.
-- recipe_source: 'drops' nu, udvideligt til 'sandnes', 'filcolana', 'striq', osv.
-- recipe_external_id: '268-1' for DROPS, designerens egen id for andre kilder.

begin;

create table public.saved_recipes (
  user_id            uuid not null references auth.users(id) on delete cascade,
  recipe_source      text not null,
  recipe_external_id text not null,
  saved_at           timestamptz not null default now(),
  primary key (user_id, recipe_source, recipe_external_id)
);

create index saved_recipes_user_idx on public.saved_recipes(user_id);

alter table public.saved_recipes enable row level security;

grant select, insert, delete on table public.saved_recipes to authenticated;
-- BEMÆRK: anon får IKKE GRANT — anonyme brugere kan ikke gemme favoritter.

drop policy if exists saved_recipes_select_own on public.saved_recipes;
create policy saved_recipes_select_own
on public.saved_recipes for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists saved_recipes_insert_own on public.saved_recipes;
create policy saved_recipes_insert_own
on public.saved_recipes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists saved_recipes_delete_own on public.saved_recipes;
create policy saved_recipes_delete_own
on public.saved_recipes for delete
to authenticated
using (auth.uid() = user_id);

commit;
