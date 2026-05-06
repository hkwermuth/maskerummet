-- Konsolidér duplikat-yarn_items (Bug B4, 2026-05-06).
--
-- Konstateret i Hannah's prod-data (hannah@leanmind.dk):
--   - Permin Bella Color Råhvid 883150 har TO På lager-rækker for samme garn
--   - Permin Bella Koral 84 har TO Brugt op-rækker peger på samme projekt
--
-- Denne migration konsoliderer eksisterende duplikat-rækker for ALLE brugere.
-- Inden for samme bruger, samme status, samme garn-identitet, samme
-- brugt_til_projekt_id (eller begge null): merge til vinder, sum quantity,
-- redirect yarn_usage, slet tabere, backfill NULL-metadata fra tabere.
--
-- Vinder-valg:
--   1. Hvis kun én række har image_url IS NOT NULL: den vinder (bevar foto)
--   2. Ellers: ældste created_at vinder (stabil deterministisk)
--
-- Idempotent: anden kørsel finder ingen duplikater og er no-op.
-- Atomisk: hele logikken pakkes i én PL/pgSQL DO-blok så temp-tabellen lever
-- fra create til block ender (Supabase SQL Editor splitter ellers statements
-- i separate transaktioner og dropper ON COMMIT DROP-tabellen prematurt).
--
-- Identitet matcher sameYarnIdentity i lib/yarn-finalize.ts:
--   1. catalog_color_id (hvis sat på begge)
--   2. case-insensitive (brand, color_name, color_code) — alle tre ikke-tomme
--
-- RLS: kører som superuser via SQL Editor — ingen policy-tjek. Egen user_id-
-- guard via PARTITION BY så vi aldrig krydser brugere.
--
-- Bemærk: hex_colors backfilles IKKE af denne migration pga. Postgres-typing-
-- besvær med array_agg(text[]). Runtime-helperen consolidateOnStockDuplicates
-- backfiller hex_colors for fremtidige duplikat-events.

do $$
declare
  group_count int;
  duplicate_count int;
  remaining_dups int;
begin
  -- Step 1: byg duplikat-grupper i temp-tabel.
  create temporary table tmp_consolidation_groups on commit drop as
  with normalized as (
    select
      yi.id,
      yi.user_id,
      yi.status,
      yi.brugt_til_projekt_id,
      yi.quantity,
      yi.image_url,
      yi.created_at,
      case
        when yi.catalog_color_id is not null then yi.catalog_color_id::text
        when btrim(coalesce(yi.brand,'')) <> ''
         and btrim(coalesce(yi.color_name,'')) <> ''
         and btrim(coalesce(yi.color_code,'')) <> ''
          then 'bnc:' || lower(btrim(yi.brand)) || '|' || lower(btrim(yi.color_name)) || '|' || lower(btrim(yi.color_code))
        else null
      end as identity_key
    from public.yarn_items yi
  ),
  ranked as (
    select
      n.*,
      count(*)      over (partition by user_id, status, identity_key, coalesce(brugt_til_projekt_id::text, 'NULL')) as group_size,
      -- Vinder: image_url-bærer først, derefter ældste created_at.
      row_number() over (
        partition by user_id, status, identity_key, coalesce(brugt_til_projekt_id::text, 'NULL')
        order by (image_url is not null) desc, created_at asc, id asc
      ) as rn
    from normalized n
    where n.identity_key is not null
  )
  select
    r.id, r.user_id, r.status, r.identity_key, r.brugt_til_projekt_id,
    r.quantity, r.image_url, r.created_at, r.group_size, r.rn,
    first_value(r.id) over (
      partition by r.user_id, r.status, r.identity_key, coalesce(r.brugt_til_projekt_id::text, 'NULL')
      order by (r.image_url is not null) desc, r.created_at asc, r.id asc
    ) as winner_id
  from ranked r
  where r.group_size > 1;

  -- Step 2: rapportér før-billede.
  select count(distinct (user_id, status, identity_key, coalesce(brugt_til_projekt_id::text, 'NULL'))),
         count(*) filter (where rn > 1)
    into group_count, duplicate_count
  from tmp_consolidation_groups;
  raise notice 'consolidate_duplicate_yarn_items: % duplikat-grupper med i alt % tabere fundet', group_count, duplicate_count;

  -- Step 3: redirect yarn_usage.yarn_item_id fra tabere → vinder.
  update public.yarn_usage yu
  set yarn_item_id = g.winner_id
  from tmp_consolidation_groups g
  where yu.yarn_item_id = g.id
    and g.rn > 1
    and yu.user_id = g.user_id;

  -- Step 4: backfill NULL-metadata på vinderne fra tabere. yarn_weight bruger
  -- array_agg fordi enum ikke har naturlig MAX-ordering. catalog_yarn_id og
  -- catalog_color_id (uuid) bruger samme mønster. hex_colors udeladt — runtime-
  -- helperen håndterer det.
  update public.yarn_items winner
  set
    image_url        = coalesce(winner.image_url,        b.image_url),
    fiber            = coalesce(winner.fiber,            b.fiber),
    yarn_weight      = coalesce(winner.yarn_weight,      b.yarn_weight),
    hex_color        = coalesce(winner.hex_color,        b.hex_color),
    gauge            = coalesce(winner.gauge,            b.gauge),
    meters           = coalesce(winner.meters,           b.meters),
    notes            = coalesce(winner.notes,            b.notes),
    color_category   = coalesce(winner.color_category,   b.color_category),
    catalog_image_url= coalesce(winner.catalog_image_url, b.catalog_image_url),
    catalog_yarn_id  = coalesce(winner.catalog_yarn_id,  b.catalog_yarn_id),
    catalog_color_id = coalesce(winner.catalog_color_id, b.catalog_color_id)
  from (
    select
      g.winner_id,
      max(case when y.image_url        is not null and y.image_url        <> '' then y.image_url        end) as image_url,
      max(case when y.fiber            is not null and y.fiber            <> '' then y.fiber            end) as fiber,
      (array_agg(y.yarn_weight) filter (where y.yarn_weight is not null))[1]                                  as yarn_weight,
      max(case when y.hex_color        is not null and y.hex_color        <> '' then y.hex_color        end) as hex_color,
      max(case when y.gauge            is not null and y.gauge            <> '' then y.gauge            end) as gauge,
      max(y.meters)                                                                                            as meters,
      max(case when y.notes            is not null and y.notes            <> '' then y.notes            end) as notes,
      max(case when y.color_category   is not null and y.color_category   <> '' then y.color_category   end) as color_category,
      max(case when y.catalog_image_url is not null and y.catalog_image_url<> '' then y.catalog_image_url end) as catalog_image_url,
      (array_agg(y.catalog_yarn_id) filter (where y.catalog_yarn_id is not null))[1]                          as catalog_yarn_id,
      (array_agg(y.catalog_color_id) filter (where y.catalog_color_id is not null))[1]                        as catalog_color_id
    from tmp_consolidation_groups g
    join public.yarn_items y on y.id = g.id and g.rn > 1
    group by g.winner_id
  ) b
  where winner.id = b.winner_id;

  -- Step 5: opdater vindernes quantity til summen af alle gruppe-rækker.
  update public.yarn_items winner
  set quantity = b.total_qty
  from (
    select g.winner_id, sum(coalesce(y.quantity, 0)) as total_qty
    from tmp_consolidation_groups g
    join public.yarn_items y on y.id = g.id
    group by g.winner_id
  ) b
  where winner.id = b.winner_id;

  -- Step 6: slet taberne. yarn_usage peger nu på vinderne.
  delete from public.yarn_items
  where id in (select id from tmp_consolidation_groups where rn > 1);

  -- Step 7: verificér resultat (skal være 0 efter en succesfuld kørsel).
  with normalized2 as (
    select
      yi.user_id, yi.status, yi.brugt_til_projekt_id,
      case
        when yi.catalog_color_id is not null then yi.catalog_color_id::text
        when btrim(coalesce(yi.brand,'')) <> ''
         and btrim(coalesce(yi.color_name,'')) <> ''
         and btrim(coalesce(yi.color_code,'')) <> ''
          then 'bnc:' || lower(btrim(yi.brand)) || '|' || lower(btrim(yi.color_name)) || '|' || lower(btrim(yi.color_code))
        else null
      end as identity_key
    from public.yarn_items yi
  )
  select count(*) into remaining_dups
  from (
    select count(*) as c
    from normalized2
    where identity_key is not null
    group by user_id, status, identity_key, coalesce(brugt_til_projekt_id::text, 'NULL')
    having count(*) > 1
  ) sub;
  raise notice 'consolidate_duplicate_yarn_items: % resterende duplikat-grupper efter konsolidering (skal være 0)', remaining_dups;
end $$;

-- Tving PostgREST til at genindlæse schema-cache (defensiv — vi har ikke
-- ændret schema, men view-cache kan referere til quantity).
notify pgrst, 'reload schema';
