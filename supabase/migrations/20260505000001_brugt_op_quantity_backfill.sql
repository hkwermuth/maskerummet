-- Bug 5 (2026-05-05): Brugt op-rækker bevarer nu antal (i stedet for at blive
-- tvunget til quantity=0). Eksisterende data fra før dette skift har quantity=0,
-- selv om der findes yarn_usage-rækker der dokumenterer faktisk forbrug.
-- Denne migration backfiller quantity for legacy Brugt op-rækker så Mit Garn
-- kan vise korrekt antal pr. række.
--
-- Scope: kun yarn_usage-rækker der peger på det SAMME projekt som Brugt op-
-- rækken er bundet til (`yarn_items.brugt_til_projekt_id = yarn_usage.project_id`).
-- Det forhindrer at delte yarn_items (samme garn brugt på tværs af flere
-- projekter) får oppustet quantity ved at SUM'e usages fra fremmede projekter.
-- Legacy-rækker uden brugt_til_projekt_id (kun fri-tekst) bliver IKKE rørt af
-- denne migration — de forbliver quantity=0. Acceptabelt edge case (de er
-- alligevel ikke koblet til et konkret projekt og kan rettes manuelt).
--
-- Idempotent: rører kun rækker hvor status='Brugt op' AND quantity=0 AND
-- brugt_til_projekt_id IS NOT NULL.
--
-- Kør i Supabase SQL Editor. RLS dækkes af eksisterende user_id-policies;
-- ingen GRANT-ændringer nødvendige.

begin;

with project_scoped as (
  select
    yu.yarn_item_id,
    yu.project_id,
    sum(yu.quantity_used) as total
  from public.yarn_usage yu
  where yu.yarn_item_id is not null
    and yu.project_id   is not null
    and yu.quantity_used is not null
  group by yu.yarn_item_id, yu.project_id
  having sum(yu.quantity_used) > 0
)
update public.yarn_items yi
set quantity = ps.total
from project_scoped ps
where yi.id                   = ps.yarn_item_id
  and yi.brugt_til_projekt_id = ps.project_id
  and yi.status               = 'Brugt op'
  and yi.quantity             = 0;

-- Rapport: hvor mange rækker blev rettet (synligt i SQL Editor's logoutput).
do $$
declare
  fixed_count int;
  skipped_count int;
begin
  select count(*) into fixed_count
  from public.yarn_items
  where status = 'Brugt op' and quantity > 0 and brugt_til_projekt_id is not null;
  select count(*) into skipped_count
  from public.yarn_items
  where status = 'Brugt op' and quantity = 0;
  raise notice 'brugt_op_quantity_backfill: % rækker har nu quantity>0 (post-fix); % rækker forbliver quantity=0 (legacy uden projekt-link)', fixed_count, skipped_count;
end $$;

commit;

-- Tving PostgREST til at genindlæse schema-cache (selvom ingen schema-ændring,
-- defensiv hvis der er view-baseret cache der refererer til quantity).
notify pgrst, 'reload schema';
