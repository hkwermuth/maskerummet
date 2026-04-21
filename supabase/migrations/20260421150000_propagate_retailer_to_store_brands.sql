-- Propagér brands fra retailer_brands tilbage til store_brands.
--
-- Baggrund: tidligere kopierede vi brand-tags fra den fysiske butik
-- (store_brands) til den koblede webshop (retailer_brands). LLM-klassifikation
-- tilføjede derefter mange flere mærker direkte til webshops (Sandnes, Rauma,
-- Mayflower, Ístex osv.) baseret på webshoppens indhold. Men disse mærker
-- endte ikke i store_brands — selv om den fysiske butik og webshoppen er
-- samme entitet.
--
-- Konsekvens: brand-chip-filtret over kortet (der bygger på store_brands)
-- viste ikke mærker som Sandnes osv., selvom samme butik rent faktisk fører
-- dem.
--
-- Denne migration synkroniserer den anden vej: for hver fysisk butik med
-- online_retailer_id, kopiér alle retailer_brands til store_brands.
--
-- Idempotent.

begin;

insert into public.store_brands (store_id, brand_id)
select distinct s.id, rb.brand_id
from public.stores s
join public.retailer_brands rb on rb.retailer_id = s.online_retailer_id
where s.online_retailer_id is not null
on conflict (store_id, brand_id) do nothing;

commit;
