-- Migrér held_with-data ind i notes ved at præfikse "Strikket med: <værdi>".
--
-- Baggrund: "Følgetråd"-feltet (held_with) er fjernet fra projekt-formularen
-- (F11-launch). DB-kolonnen lever videre for bagudkompatibilitet (CSV-
-- eksport, gamle scripts), men eksisterende data flyttes ind i fri-tekst
-- noter så brugeren ikke mister det. Idempotent — sikrer mod gen-kørsel.
--
-- Køres i Supabase SQL Editor.

begin;

update public.projects
   set notes = case
                 when notes is null or btrim(notes) = ''
                   then 'Strikket med: ' || btrim(held_with)
                 else notes || E'\n\nStrikket med: ' || btrim(held_with)
               end,
       held_with = null
 where held_with is not null
   and btrim(held_with) <> ''
   -- Skip rækker hvor migrationen allerede er kørt (idempotent guard).
   and (notes is null or notes not like '%Strikket med:%');

commit;
