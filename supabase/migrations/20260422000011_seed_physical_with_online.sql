-- Seed: link fysiske butikker til deres online-pendant.
--
-- stores.online_retailer_id FK tilføjet i migration 20260422000004. Her
-- populerer vi koblingen for alle butikker hvor vi kan identificere at
-- samme entitet findes både fysisk (i stores) og online (i online_retailers).
--
-- Metode: navn-match mellem stores.name og online_retailers.navn, plus
-- manuelt tilføjede par for kendte cases (Woolstock, City Stoffer).
--
-- Når koblingen er på plads, vil kortets pin-popup senere kunne vise
-- "Handler også online →" — struktur er klar, UI bygges som opfølgning.
--
-- Idempotent. Sikker at køre gentagne gange.

begin;

-- ── Nye online_retailers (der også er fysiske butikker) ─────────────────────
-- Woolstock har webshop på woolstock.dk men lå ikke i online_retailers endnu.

insert into public.online_retailers (slug, navn, url, land, leverer_til_dk, sidst_tjekket, beskrivelse) values
  ('woolstock', 'Woolstock', 'https://woolstock.dk', 'DK', true, current_date, 'Københavnsk garn- og kaffebutik med webshop')
on conflict (slug) do nothing;

-- ── Link stores → online_retailers ──────────────────────────────────────────
-- For hver online_retailer med eksakt navn-match i stores sætter vi koblingen.

update public.stores s
set online_retailer_id = orl.id
from public.online_retailers orl
where s.online_retailer_id is null
  and (
    lower(s.name) = lower(orl.navn)
    or lower(s.name) = lower(orl.navn) || ' aps'
    or lower(s.name) = lower(orl.navn) || '.dk'
  );

-- Manuelle matches (afvigende navne)
update public.stores
set online_retailer_id = (select id from public.online_retailers where slug = 'woolstock')
where lower(name) = 'woolstock' and postcode = '2100'
  and online_retailer_id is null;

update public.stores
set online_retailer_id = (select id from public.online_retailers where slug = 'citystoffer')
where postcode = '8000'
  and (lower(name) = 'city stoffer' or lower(name) = 'city stoffer & garn')
  and online_retailer_id is null;

-- ── Kopiér brand-koblinger ──────────────────────────────────────────────────
-- For butikker der nu er linket til online_retailer: sørg for at de mærker
-- butikken fører (store_brands) også er tilgængelige via online-forhandleren
-- (retailer_brands). Det sikrer at brand-filter i online-sektionen viser
-- forhandleren når filteret matcher ét af butikkens mærker.

insert into public.retailer_brands (retailer_id, brand_id)
select distinct s.online_retailer_id, sb.brand_id
from public.stores s
join public.store_brands sb on sb.store_id = s.id
where s.online_retailer_id is not null
on conflict (retailer_id, brand_id) do nothing;

commit;
