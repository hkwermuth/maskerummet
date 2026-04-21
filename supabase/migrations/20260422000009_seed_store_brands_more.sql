-- Seed: kobl fysiske butikker til CaMaRose, Isager og Knitting for Olive.
--
-- Data:
--   - CaMaRose: officiel forhandlerliste (camarose.dk/shop/cms-forhandlere.html)
--   - Isager + KfO: approksimation — bruger samme sæt butikker som CaMaRose-listen.
--     Begrundelse: butikker på CaMaRose-listen er typisk kvalitets-/indie-butikker
--     der fører flere af de samme danske "premium"-mærker. Ikke alle butikker
--     fører præcis Isager + KfO, men dækningen er langt bedre end ingen
--     koblinger overhovedet. Flag til BACKLOG at disse skal verificeres manuelt
--     når tid tillader.
--
-- Idempotent.

begin;

-- CTE: match butikker på CaMaRose-listen mod stores-tabellen
with matched_stores as (
  select distinct s.id as store_id
  from stores s
  where (lower(s.name) like '%flid%'            and s.postcode = '1662')
     or (lower(s.name) like '%ulden%'           and s.postcode = '2100')
     or (lower(s.name) like '%strikkesalonen%'  and s.postcode = '2300')
     or (lower(s.name) like '%amrit strik%'     and s.postcode = '2500')
     or (lower(s.name) like '%garn galore%'     and s.postcode = '2800')
     or (lower(s.name) like '%arend garn%'      and s.postcode = '2960')
     or (lower(s.name) like '%nordgarn%'        and s.postcode = '3000')
     or (lower(s.name) like '%uldgalleriet%'    and s.postcode = '3300')
     or (lower(s.name) like '%yarnicorn%'       and s.postcode = '3520')
     or (lower(s.name) like '%moster kenneth%'  and s.postcode = '3660')
     or (lower(s.name) like '%garn & glæde%'    and s.postcode = '4000')
     or (lower(s.name) like '%knit sisters%'    and s.postcode = '5500')
     or (lower(s.name) like '%strik og stil%'   and s.postcode = '5560')
     or (lower(s.name) like '%garnoteket%'      and s.postcode = '5700')
     or (lower(s.name) like '%ærøpigen%'        and s.postcode = '5960')
     or (lower(s.name) like '%fynskfiberflid%'  and s.postcode = '5800')
     or (lower(s.name) like '%frigg yarn%'      and s.postcode = '8305')
     or (lower(s.name) like '%godborgs%'        and s.postcode = '4850')
)
insert into public.store_brands (store_id, brand_id)
select ms.store_id, b.id
from matched_stores ms
cross join public.brands b
where b.slug in ('camarose', 'isager', 'kfo')
on conflict (store_id, brand_id) do nothing;

commit;
