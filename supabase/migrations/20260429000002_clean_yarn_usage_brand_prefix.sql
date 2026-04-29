-- Strip duplikeret brand-præfix fra yarn_usage.yarn_name.
-- Kontekst: yarn_usage-rækker oprettet via katalog-flow gemte tidligere
-- yarn_name = displayYarnName(yarn) = full_name = "Permin Hannah", samtidig
-- med yarn_brand = "Permin". Det gav "Permin Permin Hannah" på projekt-kort
-- og i detalje-modal. Skrivelogikken er nu rettet til at gemme yarn_name
-- uden brand-præfix; denne migration rydder de eksisterende 38 rækker.
--
-- Match: yarn_name starter med yarn_brand + ASCII space (case-insensitive,
-- eksakt brand+space — håndterer "BC Garn"-stil brands med space korrekt
-- fordi LIKE-mønstret er bygget på brand-strengen som helhed).
-- Idempotent: 2. kørsel rammer 0 rækker.
-- Sikkerhed: ekstra guard mod tomt resultat (skipper rækker hvor strip
-- ville efterlade tom yarn_name — fx hvis name == brand).

begin;

update public.yarn_usage
   set yarn_name = trim(substring(yarn_name from char_length(yarn_brand) + 2))
 where yarn_brand is not null
   and yarn_brand <> ''
   and yarn_name is not null
   and lower(yarn_name) like lower(yarn_brand) || ' %'
   and trim(substring(yarn_name from char_length(yarn_brand) + 2)) <> '';

commit;
