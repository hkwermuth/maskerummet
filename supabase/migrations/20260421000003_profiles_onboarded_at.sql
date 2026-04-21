-- Onboarding: spor om bruger har set velkomst-modal første gang.
-- Kolonnen bruges KUN af egen bruger (dækket af eksisterende RLS-policies og kolonne-GRANTs).
begin;

alter table public.profiles
  add column if not exists onboarded_at timestamptz null;

-- Bemærk: `profiles_update_own` tillader allerede update af alle kolonner for egen bruger.
-- Kolonne-GRANT til anon udeladt bevidst (kun id + display_name deles til anon) — onboarded_at
-- eksponeres aldrig offentligt.

commit;
