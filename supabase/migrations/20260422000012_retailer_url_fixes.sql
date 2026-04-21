-- URL-rettelser + fjern Rundpinden + tilføj Sommerfuglen.
--
-- Bruger-rapporterede fejl fra første data-gennemgang:
--   - garn-og-traad.dk → garnogtraad.dk
--   - garnkompagniet.dk → garn-kompagniet.dk
--   - svinninge-garn.dk → svinningegarn.dk
--   - rundpinden.dk findes ikke (kan ikke naes) — slet række
--
-- Sommerfuglen var kun i stores (fysisk butik i København K) uden koblet
-- online-forhandler, selvom de har en webshop paa sommerfuglen.dk.
-- Oprettes som online_retailer, linkes til store, brand-tags propageres.
--
-- Idempotent.

begin;

-- URL-rettelser
update public.online_retailers set url = 'https://garnogtraad.dk'   where slug = 'garn-og-traad';
update public.online_retailers set url = 'https://garn-kompagniet.dk' where slug = 'garn-kompagniet';
update public.online_retailers set url = 'https://svinningegarn.dk' where slug = 'svinninge-garn';

-- Fjern Rundpinden (cascade fjerner retailer_brands-rækker automatisk)
delete from public.online_retailers where slug = 'rundpinden';

-- Tilfoej Sommerfuglen
insert into public.online_retailers (slug, navn, url, land, leverer_til_dk, sidst_tjekket, beskrivelse) values
  ('sommerfuglen', 'Sommerfuglen', 'https://sommerfuglen.dk', 'DK', true, current_date, 'Strik- og brodeributik i København K + webshop')
on conflict (slug) do nothing;

-- Link Sommerfuglen fysisk butik til den nye online_retailer
update public.stores
set online_retailer_id = (select id from public.online_retailers where slug = 'sommerfuglen')
where lower(name) = 'sommerfuglen' and postcode = '1467'
  and online_retailer_id is null;

-- Propagér brand-tags fra store_brands til retailer_brands for nu-koblede butikker
insert into public.retailer_brands (retailer_id, brand_id)
select distinct s.online_retailer_id, sb.brand_id
from public.stores s
join public.store_brands sb on sb.store_id = s.id
where s.online_retailer_id is not null
on conflict (retailer_id, brand_id) do nothing;

commit;
