-- Strip "(... by BRAND)"-parens-suffix fra yarn_usage.yarn_name.
-- Kontekst: opfølgning på 20260429000002. Den migration ramte rækker hvor
-- yarn_name startede med yarn_brand+space ("Permin Bella" + brand="Permin").
-- Denne migration rammer rækker hvor yarn_name slutter med "(... by BRAND)"
-- ("Bella (by Permin)", "Bella Color (Bella Color by Permin)" + brand="Permin").
--
-- Visuelt blev rækkerne renderet korrekt via dedupeYarnNameFromBrand på
-- render-tid, men data var ikke kanonisk. Verificeret 2026-04-29: 16 rækker
-- ramt, alle Permin Bella + Bella Color.
--
-- Match: yarn_name slutter med "(... by BRAND)" hvor BRAND = yarn_brand
-- (case-insensitive). Generel regex — ikke hardcodet til Permin.
-- Idempotent: 2. kørsel rammer 0 rækker.

begin;

update public.yarn_usage
   set yarn_name = trim(regexp_replace(yarn_name, '\s*\(.*by\s+' || yarn_brand || '\s*\)\s*$', '', 'i'))
 where yarn_brand is not null
   and yarn_brand <> ''
   and yarn_name is not null
   and yarn_name ~* ('\(.*by\s+' || yarn_brand || '\s*\)\s*$');

commit;
