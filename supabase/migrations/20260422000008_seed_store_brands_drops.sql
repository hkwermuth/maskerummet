-- Seed: kobl fysiske butikker til Drops-mærket.
--
-- store_brands-tabellen havde hidtil kun koblinger for Permin (188) og
-- Filcolana (104). Drops er Danmarks største garn-mærke men var helt uden
-- koblinger — hvilket fik filter-valg "Drops" på Find forhandler-siden til
-- at vise tom tilstand på kortet.
--
-- Data: garnstudio.com/findastore.php (DK-forhandlere pr. april 2026).
-- Fysiske butikker der matcher vores stores-tabel på navn + postnummer.
-- Webshops (uden fysisk butik) ligger kun i online_retailers.
--
-- Idempotent via on conflict do nothing. 16 koblinger tilføjes.

begin;

-- CTE der matcher Drops-butikker mod eksisterende stores via navn-pattern +
-- postnummer. Kun matches med ét unikt hit bliver seed'et.
with drops_stores as (
  select s.id as store_id
  from stores s
  where (lower(s.name) like '%anita%'           and s.postcode = '2700')
     or (lower(s.name) like '%butik hanne%'     and s.postcode = '5400')
     or (lower(s.name) like '%centrum garn%'    and s.postcode = '4400')
     or (lower(s.name) like '%enghoff%'         and s.postcode = '4540')
     or (lower(s.name) like '%fabricroad%'      and s.postcode = '6000')
     or (lower(s.name) like '%garnbixen%'       and s.postcode = '4300')
     or (lower(s.name) like '%garnværkstedet%'  and s.postcode = '8541')
     or (lower(s.name) like '%knit by buur%'    and s.postcode = '4736')
     or (lower(s.name) like '%krestoffer%'      and s.postcode = '5230')
     or (lower(s.name) like '%medy%'            and s.postcode = '7800')
     or (lower(s.name) like '%netgarn%'         and s.postcode = '8000')
     or (lower(s.name) like '%nicoline%'        and s.postcode = '2200')
     or (lower(s.name) like '%ret & vrang%'     and s.postcode = '7500')
     or (lower(s.name) like '%strik og stil%'   and s.postcode = '5560')
     or (lower(s.name) like '%strikkenyheder%'  and s.postcode = '8600')
     or (lower(s.name) like '%the corner%'      and s.postcode = '9800')
)
insert into public.store_brands (store_id, brand_id)
select ds.store_id, b.id
from drops_stores ds
cross join public.brands b
where b.slug = 'drops'
on conflict (store_id, brand_id) do nothing;

commit;
