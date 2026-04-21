-- Stores ↔ online_retailers link.
--
-- En fysisk butik kan også have en webshop. For at undgå at samme butik
-- dubleres (én række i stores + én i online_retailers uden sammenhæng)
-- tilføjer vi en nullable FK fra stores til online_retailers.
--
-- Brugsscenarie:
--   - Pin på kort (fra stores) kan i popup vise "Handler også online →" med
--     link til den koblede online-forhandler.
--   - Online-sektionen vil fortsat vise forhandleren (fra online_retailers),
--     uanset om den er koblet eller ej — overlap er ønsket, jfr. specifikation:
--     "butikker med både fysisk og online skal optræde begge steder".
--
-- Idempotent.

begin;

alter table if exists public.stores
  add column if not exists online_retailer_id uuid null
    references public.online_retailers(id) on delete set null;

create index if not exists stores_online_retailer_id_idx
  on public.stores (online_retailer_id);

commit;
