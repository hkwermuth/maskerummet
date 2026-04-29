-- Ryd "(by Permin)" / "(Bella Color by Permin)" fra Permin Bella + Bella Color.
-- Kontekst: tidligere import havde brand-suffiks gemt i `series` + `full_name`,
-- hvilket gav støjede labels på Garnlager-kort, katalog-dropdown og /garn/[slug].
--
-- Datafix:
-- 1) yarns: series=NULL, full_name='Permin Bella' / 'Permin Bella Color'
-- 2) yarn_items: rens brugernes lager-rækker hvor name er den fulde støjede streng
--    (matchet eksakt — manuelt redigerede navne røres ikke; dedupe-logikken på
--    render-tid renser visuelt op for ældre data der måtte slippe igennem).
-- Verificeret 2026-04-29 mod prod-data: 2 yarns-rækker + 17 yarn_items rammes.
-- Idempotent: 2. kørsel rammer 0 rækker.
--
-- TODO (manuel): opdater `content/yarns.xlsx` så `npm run import:yarns` ikke
-- gen-introducerer "(by Permin)" / "(Bella Color by Permin)" i series/full_name.
-- Indtil da: kør IKKE import-scriptet — eller risiker rollback af denne migration.

begin;

-- 1) Katalog-rækker
update public.yarns
   set series = null,
       full_name = 'Permin Bella'
 where producer = 'Permin'
   and name = 'Bella'
   and (series is not null or full_name is distinct from 'Permin Bella');

update public.yarns
   set series = null,
       full_name = 'Permin Bella Color'
 where producer = 'Permin'
   and name = 'Bella Color'
   and (series is not null or full_name is distinct from 'Permin Bella Color');

-- 2) Brugernes yarn_items — kun Permin-mærkede med præcist suffiks-match.
update public.yarn_items
   set name = 'Permin Bella'
 where brand = 'Permin'
   and name in ('Permin Bella (by Permin)', 'Bella (by Permin)');

update public.yarn_items
   set name = 'Permin Bella Color'
 where brand = 'Permin'
   and name in (
     'Permin Bella Color (Bella Color by Permin)',
     'Bella Color (Bella Color by Permin)'
   );

commit;
