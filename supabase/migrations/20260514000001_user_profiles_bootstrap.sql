-- Bootstrap user_profiles-tabellen + RLS-policies.
--
-- Tabellen blev oprindeligt oprettet manuelt via Supabase Studio i prod (før
-- migrations-disciplinen), så fresh-DB replays fejler i 20260424000002_is_editor_function.sql
-- med "relation public.user_profiles does not exist". Denne migration porterer
-- definitionen ind i repo'et, så `supabase db reset` virker fra bunden.
--
-- Spejler eksakt prod-state pr. 2026-05-14 (verificeret via information_schema).
-- IF NOT EXISTS-clauses gør migrationen sikker at køre mod en DB hvor tabellen
-- allerede findes (no-op).

begin;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text default 'user' check (role in ('user', 'editor', 'admin')),
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

-- RLS-policies: brugere kan kun læse/skrive deres egen profil. Editor-rolle
-- tildeles via service_role (se lib/editors.ts:ensureEditorRole), så denne
-- tabel behøver ikke editor-bypass-policies på RLS-niveau.
drop policy if exists "read own profile" on public.user_profiles;
create policy "read own profile" on public.user_profiles
  for select using (auth.uid() = id);

drop policy if exists "insert own profile" on public.user_profiles;
create policy "insert own profile" on public.user_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.user_profiles;
create policy "update own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- Note (2026-05-14): I prod mangler eksplicitte GRANTs til anon/authenticated
-- på denne tabel — det forklarer hvorfor user_profiles er tom (ingen brugere
-- har INSERTet en row, fordi PostgREST blokerer dem før RLS evalueres).
-- Editor-flowet fungerer alligevel fordi ensureEditorRole bruger service_role
-- der bypasser både GRANT og RLS.
--
-- Vi tilføjer GRANTs her så fremtidig user-profile-funktionalitet (display_name,
-- preferences) ikke kræver endnu en migration. Dette afspejler IKKE prod, men
-- er den korrekte forwards-compatible state.
grant select, insert, update on public.user_profiles to authenticated;

commit;
