-- Saved yarns (favoritter) per bruger.
-- Bruger gemmer garn fra kataloget ved at klikke hjertet på /garn/[slug].
-- Vi spejler saved_recipes-mønstret, men yarns lever i DB med stabile uuid'er,
-- så vi bruger ægte FK fremfor source+external_id-kompositnøgle.

begin;

create table public.saved_yarns (
  user_id  uuid not null references auth.users(id) on delete cascade,
  yarn_id  uuid not null references public.yarns(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, yarn_id)
);

create index saved_yarns_user_idx on public.saved_yarns(user_id);

alter table public.saved_yarns enable row level security;

grant select, insert, delete on table public.saved_yarns to authenticated;
-- BEMÆRK: anon får IKKE GRANT — anonyme brugere kan ikke gemme favoritter.

drop policy if exists saved_yarns_select_own on public.saved_yarns;
create policy saved_yarns_select_own
on public.saved_yarns for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists saved_yarns_insert_own on public.saved_yarns;
create policy saved_yarns_insert_own
on public.saved_yarns for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists saved_yarns_delete_own on public.saved_yarns;
create policy saved_yarns_delete_own
on public.saved_yarns for delete
to authenticated
using (auth.uid() = user_id);

commit;
