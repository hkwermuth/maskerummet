-- Fix: public.is_editor() fejlede med "permission denied for table user_profiles"
-- når den blev kaldt af en almindelig authenticated bruger (fx i RLS-policies).
--
-- Funktionen var defineret uden SECURITY DEFINER og kørte derfor med kaldende
-- brugers rettigheder. authenticated har ikke GRANT SELECT på user_profiles
-- (og bør ikke have det — det ville udstille alle brugeres roller).
--
-- Løsning: SECURITY DEFINER så funktionen kører med funktions-ejerens
-- rettigheder. set search_path = public for at undgå at en angriber kan
-- shadow'e public-tabeller via egen schema.

begin;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('editor','admin')
  );
$$;

-- Sørg for at authenticated kan execute den (og ingen andre).
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to authenticated;

commit;
