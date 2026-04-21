-- Grant SELECT på online-forhandler-tabeller til anon + authenticated.
--
-- Bug: de tre nye tabeller (online_retailers, retailer_brands) havde RLS-policy
-- med "to anon, authenticated using (true)" MEN manglede GRANT SELECT på selve
-- tabellen. Resultatet var "permission denied for table online_retailers" fra
-- anon-klient — policy alene er ikke nok; postgres kræver også base-privilegier.
--
-- brands-tabellen havde allerede GRANT SELECT fra tidligere opsætning,
-- og dækkes her kun for idempotent vedligehold.
--
-- Idempotent. Sikker at køre gentagne gange.

begin;

grant select on public.brands           to anon, authenticated;
grant select on public.online_retailers to anon, authenticated;
grant select on public.retailer_brands  to anon, authenticated;

commit;
