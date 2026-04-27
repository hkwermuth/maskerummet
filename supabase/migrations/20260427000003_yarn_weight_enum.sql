-- F1 fra brief 2026-04-27 — eksplicit yarn_weight Postgres-enum på yarns.
-- Fixer "BC Garn Luxor-bug": Luxor er reelt fingering, men gammelt fri-tekst-felt
-- thickness_category klassificerede den som lace.
--
-- Kør i Supabase SQL Editor. notify pgrst kører automatisk til sidst.
-- Idempotent: kan genkøres uden datatab.
--
-- Bagudkompatibilitet: thickness_category bevares (læses stadig af eksisterende
-- offentlige sider og filtre). Sletning sker først når alle læsere migreres,
-- planlagt som separat migration efter F2-F4.

begin;

-- 1) Opret enum-typen idempotent
do $$
begin
  if not exists (select 1 from pg_type where typname = 'yarn_weight') then
    create type public.yarn_weight as enum
      ('lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super_bulky');
  end if;
end$$;

-- 2) Tilføj nullable kolonne
alter table public.yarns
  add column if not exists yarn_weight public.yarn_weight null;

comment on column public.yarns.yarn_weight is
  'Kanonisk vægt-klassifikation (8 værdier). Afløser fri-tekst thickness_category. NULL = endnu ikke klassificeret af reviewer.';

-- 3) Indeks til filtrering i offentlig katalog
create index if not exists yarns_yarn_weight_idx on public.yarns (yarn_weight);

-- 4) Backfill via case-mapping. Konservativ: tvivl → NULL.
--    Kun rækker uden yarn_weight overskrives (idempotent ved gen-kørsel).
update public.yarns
   set yarn_weight = (case lower(btrim(thickness_category::text))
     -- Lace
     when 'lace'           then 'lace'
     when 'cobweb'         then 'lace'
     when 'lace weight'    then 'lace'
     when '1-ply'          then 'lace'
     when '1ply'           then 'lace'
     -- Fingering
     when 'fingering'      then 'fingering'
     when '4-ply'          then 'fingering'
     when '4ply'           then 'fingering'
     when 'sock'           then 'fingering'
     when 'sokkegarn'      then 'fingering'
     when 'super fine'     then 'fingering'
     when 'baby'           then 'fingering'
     -- Sport
     when 'sport'          then 'sport'
     when '5-ply'          then 'sport'
     when '5ply'           then 'sport'
     -- DK
     when 'dk'             then 'dk'
     when 'double knit'    then 'dk'
     when '8-ply'          then 'dk'
     when '8ply'           then 'dk'
     when 'light worsted'  then 'dk'
     -- Worsted
     when 'worsted'        then 'worsted'
     when '10-ply'         then 'worsted'
     when '10ply'          then 'worsted'
     when 'medium'         then 'worsted'
     when 'afghan'         then 'worsted'
     -- Aran
     when 'aran'           then 'aran'
     when '12-ply'         then 'aran'
     when '12ply'          then 'aran'
     when 'heavy worsted'  then 'aran'
     -- Bulky
     when 'bulky'          then 'bulky'
     when 'chunky'         then 'bulky'
     when '14-ply'         then 'bulky'
     when '14ply'          then 'bulky'
     -- Super bulky (jumbo merges hertil — ikke en separat enum-værdi)
     when 'super_bulky'    then 'super_bulky'
     when 'super bulky'    then 'super_bulky'
     when 'superbulky'     then 'super_bulky'
     when 'jumbo'          then 'super_bulky'
     when 'roving'         then 'super_bulky'
     -- Tvetydige (unspun, danske termer som tynd/tyk, NULL, '') → NULL
     else null
   end)::public.yarn_weight
 where yarn_weight is null;

-- 5) Eksplicit verificeret BC Garn Luxor → fingering.
--    Tidligere fri-tekst-værdi var 'lace' hvilket er forkert (Luxor er fingering).
--    Override sker EFTER backfill så den vinder uanset thickness_category-værdi.
update public.yarns
   set yarn_weight = 'fingering'::public.yarn_weight
 where producer ilike 'BC Garn'
   and name ilike 'Luxor';

-- 6) Recreate yarns_full-viewet med yarn_weight tilføjet i enden.
--    Definition matcher 20260420000001 + ny yarn_weight-kolonne.
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
    hero_image_url,
    yarn_weight
   from yarns y;

-- 7) PostgREST-grants — RLS alene er ikke nok (CLAUDE.md GRANT-påbud).
grant select, update on public.yarns to authenticated;

-- Anon må læse den nye kolonne på offentlig katalog.
grant select (yarn_weight) on public.yarns to anon;

-- yarns_full-viewet: eksplicit grant for selv-dokumentation.
-- CREATE OR REPLACE bevarer eksisterende grants, men ved fri-feltet recreate
-- ovenfor (linje 96+) er det værd at gøre intentionen tydelig her.
grant select on public.yarns_full to anon, authenticated;

commit;

-- Tving PostgREST til at genindlæse schema-cache, ellers returnerer
-- select(..., yarn_weight) 400 indtil næste naturlige reload.
notify pgrst, 'reload schema';

-- Verifikations-anker (kører efter commit). Operator ser i SQL Editor output:
-- - Luxor er fingering (ikke lace)
-- - Hvor stor andel af kataloget der blev backfilled
do $$
declare
  v_luxor_weight public.yarn_weight;
  v_total_with_weight int;
  v_total int;
begin
  select yarn_weight into v_luxor_weight
    from public.yarns
   where producer ilike 'BC Garn' and name ilike 'Luxor'
   limit 1;
  select count(*) into v_total_with_weight from public.yarns where yarn_weight is not null;
  select count(*) into v_total from public.yarns;
  raise notice 'BC Garn Luxor.yarn_weight = %', coalesce(v_luxor_weight::text, 'NULL (Luxor ikke i kataloget)');
  raise notice 'Backfill: % af % yarns har yarn_weight sat', v_total_with_weight, v_total;
end$$;
