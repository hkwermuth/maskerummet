-- Produktbillede (hero) pr. garn i kataloget. Bruges i /garn/[slug] til at vise garnet i normal størrelse.
-- Kør i Supabase SQL Editor.
--
-- Struktur (schema-only — data styres via Excel-import, se scripts/import-yarns.mjs):
--   1) Tilføj kolonne på yarns
--   2) CREATE OR REPLACE VIEW yarns_full (viewet har eksplicit kolonneliste, skal opdateres
--      for at eksponere hero_image_url — verificeret 2026-04-20 via pg_get_viewdef)
--
-- Seed af konkrete garn (Drops Brushed Alpaca Silk, Drops Baby Merino, Permin Bella, Bella Color, Hannah)
-- sker via content/yarns.xlsx + `npm run import:yarns` — IKKE her.

begin;

-- 1) Tilføj kolonne
alter table public.yarns
  add column if not exists hero_image_url text;

comment on column public.yarns.hero_image_url is
  'Produktbillede (stor, "normal størrelse"), vist øverst på /garn/[slug]. Kræver rettighedsgodkendelse fra producent, eller skal være eget foto.';

-- 2) Recreate yarns_full-viewet med hero_image_url tilføjet i enden.
-- Definition matcher prod pr. 2026-04-20. Ændringer ud over at tilføje hero_image_url skal ske i en
-- separat migration for at holde denne minimal.
create or replace view public.yarns_full as
 select id,
    producer,
    name,
    series,
    full_name,
    fiber_main,
    thickness_category,
    thickness_category_source,
    ball_weight_g,
    length_per_100g_m,
    needle_min_mm,
    needle_max_mm,
    gauge_stitches_10cm,
    gauge_rows_10cm,
    gauge_needle_mm,
    twist_structure,
    ply_count,
    spin_type,
    finish,
    wash_care,
    origin_country,
    fiber_origin_country,
    status,
    discontinued_year,
    certifications,
    seasonal_suitability,
    use_cases,
    description,
    notes_internal,
    created_at,
    updated_at,
    created_by,
    ( select jsonb_agg(jsonb_build_object('fiber', fc.fiber, 'percentage', fc.percentage) order by fc.sort_order) as jsonb_agg
        from yarn_fiber_components fc
        where fc.yarn_id = y.id ) as fibers,
    ( select count(*) as count
        from colors c
        where c.yarn_id = y.id ) as color_count,
    hero_image_url
   from yarns y;

commit;
