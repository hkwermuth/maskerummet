-- Community-bidrag af manglende EAN-koder på garn-banderoler.
-- Brugere kan registrere stregkoder vi ikke har i kataloget — en editor
-- godkender koblingen, og koden bliver herefter sat på den rigtige colors-row.
--
-- Mønstret spejler 20260101000005_substitution_community.sql.
-- Forudsætter: public.is_editor() (20260424000002), public.tg_set_updated_at().

begin;

-- ── Tabel ───────────────────────────────────────────────────────────────────
create table if not exists public.barcode_suggestions (
  id uuid primary key default gen_random_uuid(),
  barcode text not null check (length(btrim(barcode)) between 6 and 20),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Bidragyderens bedste gæt (mindst én af _producer/_yarn_name eller _yarn_id bør være sat)
  suggested_yarn_id uuid null references public.yarns(id) on delete set null,
  suggested_color_id uuid null references public.colors(id) on delete set null,
  suggested_producer text null,
  suggested_yarn_name text null,
  suggested_color_name text null,
  suggested_color_number text null,
  banderole_image_url text null,
  comment text null check (comment is null or length(btrim(comment)) <= 2000),

  status text not null default 'new'
    check (status in ('new', 'approved', 'rejected')),

  -- Editor-resolution
  resolved_color_id uuid null references public.colors(id) on delete set null,
  resolved_by uuid null references auth.users(id) on delete set null,
  resolved_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists barcode_suggestions_barcode_idx
  on public.barcode_suggestions (barcode);
create index if not exists barcode_suggestions_status_new_idx
  on public.barcode_suggestions (status) where status = 'new';
create index if not exists barcode_suggestions_user_idx
  on public.barcode_suggestions (user_id);

-- Genbrug tg_set_updated_at() fra 20260101000005
drop trigger if exists set_updated_at on public.barcode_suggestions;
create trigger set_updated_at
before update on public.barcode_suggestions
for each row execute function public.tg_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.barcode_suggestions enable row level security;

-- SELECT: bruger ser egne; editor ser alle.
drop policy if exists barcode_suggestions_select on public.barcode_suggestions;
create policy barcode_suggestions_select
on public.barcode_suggestions for select
to authenticated
using (user_id = auth.uid() or public.is_editor());

-- INSERT: bruger opretter egne; status låst til 'new' ved oprettelse.
drop policy if exists barcode_suggestions_insert on public.barcode_suggestions;
create policy barcode_suggestions_insert
on public.barcode_suggestions for insert
to authenticated
with check (auth.uid() = user_id and status = 'new');

-- UPDATE: kun editor kan ændre (status, resolved_*).
drop policy if exists barcode_suggestions_moderate on public.barcode_suggestions;
create policy barcode_suggestions_moderate
on public.barcode_suggestions for update
to authenticated
using (public.is_editor())
with check (public.is_editor());

-- DELETE: editor + ejer på egne pending-forslag.
drop policy if exists barcode_suggestions_delete on public.barcode_suggestions;
create policy barcode_suggestions_delete
on public.barcode_suggestions for delete
to authenticated
using (public.is_editor() or (auth.uid() = user_id and status = 'new'));

-- PostgREST-grants — RLS alene er ikke nok.
grant select, insert, update, delete on public.barcode_suggestions to authenticated;

-- ── Atomic approve via SECURITY DEFINER RPC ─────────────────────────────────
-- Sikrer at colors.barcode-set + suggestion.status='approved' sker i én
-- transaktion. Pre-check: hvis EAN allerede sidder på en anden farve, nullify
-- den først (editor har trods alt manuelt valgt at flytte koden).
create or replace function public.approve_barcode_suggestion(
  p_suggestion_id uuid,
  p_color_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barcode text;
begin
  if not public.is_editor() then
    raise exception 'Kun editors kan godkende stregkode-forslag';
  end if;

  select barcode into v_barcode
  from public.barcode_suggestions
  where id = p_suggestion_id and status = 'new';
  if v_barcode is null then
    raise exception 'Forslag ikke fundet eller allerede behandlet';
  end if;

  -- Hvis EAN allerede er på en anden farve, fjern det der først for at
  -- undgå unique-constraint-fejl (colors_barcode_unique).
  update public.colors set barcode = null
   where barcode = v_barcode and id <> p_color_id;

  update public.colors set barcode = v_barcode where id = p_color_id;

  update public.barcode_suggestions
     set status = 'approved',
         resolved_color_id = p_color_id,
         resolved_by = auth.uid(),
         resolved_at = now()
   where id = p_suggestion_id;
end;
$$;

revoke all on function public.approve_barcode_suggestion(uuid, uuid) from public;
grant execute on function public.approve_barcode_suggestion(uuid, uuid) to authenticated;

-- ── Reject via SECURITY DEFINER RPC ─────────────────────────────────────────
-- Holder symmetri med approve så klient-koden kan kalde RPC i begge tilfælde.
create or replace function public.reject_barcode_suggestion(
  p_suggestion_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_editor() then
    raise exception 'Kun editors kan afvise stregkode-forslag';
  end if;

  update public.barcode_suggestions
     set status = 'rejected',
         resolved_by = auth.uid(),
         resolved_at = now()
   where id = p_suggestion_id and status = 'new';

  if not found then
    raise exception 'Forslag ikke fundet eller allerede behandlet';
  end if;
end;
$$;

revoke all on function public.reject_barcode_suggestion(uuid) from public;
grant execute on function public.reject_barcode_suggestion(uuid) to authenticated;

commit;
