-- RLS policies for yarn_items and yarn_usage.
-- Ensures users can only access their own yarn stash and usage records.
-- Run in Supabase SQL Editor.

begin;

-- ── yarn_items ──────────────────────────────────────────────────────────────

alter table public.yarn_items enable row level security;

grant select, insert, update, delete on table public.yarn_items to authenticated;

drop policy if exists yarn_items_select_own on public.yarn_items;
create policy yarn_items_select_own
on public.yarn_items for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists yarn_items_insert_own on public.yarn_items;
create policy yarn_items_insert_own
on public.yarn_items for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists yarn_items_update_own on public.yarn_items;
create policy yarn_items_update_own
on public.yarn_items for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists yarn_items_delete_own on public.yarn_items;
create policy yarn_items_delete_own
on public.yarn_items for delete
to authenticated
using (auth.uid() = user_id);

-- ── yarn_usage ──────────────────────────────────────────────────────────────

alter table public.yarn_usage enable row level security;

grant select, insert, update, delete on table public.yarn_usage to authenticated;

drop policy if exists yarn_usage_select_own on public.yarn_usage;
create policy yarn_usage_select_own
on public.yarn_usage for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists yarn_usage_insert_own on public.yarn_usage;
create policy yarn_usage_insert_own
on public.yarn_usage for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists yarn_usage_update_own on public.yarn_usage;
create policy yarn_usage_update_own
on public.yarn_usage for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists yarn_usage_delete_own on public.yarn_usage;
create policy yarn_usage_delete_own
on public.yarn_usage for delete
to authenticated
using (auth.uid() = user_id);

commit;
