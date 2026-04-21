-- Retailer_brands: many-to-many mellem online_retailers og brands.
--
-- En forhandler fører typisk flere mærker (fx Rito fører både Drops og Permin).
-- Et mærke føres af flere forhandlere. Junction-tabellen tillader filtrering
-- "vis forhandlere der fører Drops" via en simpel join.
--
-- RLS: offentlig SELECT. Writes kun via service_role.

begin;

create table if not exists public.retailer_brands (
  retailer_id uuid not null references public.online_retailers(id) on delete cascade,
  brand_id    uuid not null references public.brands(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (retailer_id, brand_id)
);

-- PK dækker (retailer_id, brand_id). Ekstra index for modsat join-retning
-- ("alle forhandlere for et brand") — primær brugsscenarie for brand-filtret.
create index if not exists retailer_brands_brand_retailer_idx
  on public.retailer_brands (brand_id, retailer_id);

alter table public.retailer_brands enable row level security;

drop policy if exists retailer_brands_public_read on public.retailer_brands;
create policy retailer_brands_public_read
  on public.retailer_brands for select
  to anon, authenticated
  using (true);

commit;
