-- OAuth-login (Google m.fl.) skaber brugere via Supabase auth uden at vores app
-- har en chance for at oprette public.profiles selv. Denne trigger sørger for at
-- alle nye auth.users får en profiles-row med et fornuftigt display_name.
--
-- Sikkerhed:
--   * SECURITY DEFINER + fast search_path (pg_temp sidst) — kører som ejer
--     uafhængigt af RLS, og immune mod search_path-baseret hijacking.
--   * EXCEPTION-wrapper omkring inserten — hvis profiles-skrivning fejler,
--     må auth.users-INSERT IKKE rulle tilbage. Bedre at have en bruger uden
--     profiles-row end ingen bruger overhovedet.
--   * ON CONFLICT DO NOTHING — beskytter mod race med eventuelt eksisterende
--     app-kode der også kunne oprette en profiles-row.
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  begin
    insert into public.profiles (id, display_name)
    values (new.id, v_display_name)
    on conflict (id) do nothing;
  exception
    when others then
      raise warning 'handle_new_user: profiles insert failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
