-- F4 fra brief 2026-04-27 — multi-farve garn på Mit Garnlager.
-- Tilføjer hex_colors text[] til yarn_items (1-5 hex-strings).
-- NULL eller tom = single-color via eksisterende hex_color (bagudkompatibel).
-- Når array har ≥2 entries, renderer kortet en CSS linear-gradient.
--
-- Kør i Supabase SQL Editor. Idempotent: kan genkøres uden datatab.

begin;

-- 1) Ny kolonne — nullable. NULL betyder "ingen multi-farve, brug hex_color som single".
alter table public.yarn_items
  add column if not exists hex_colors text[] null;

comment on column public.yarn_items.hex_colors is
  'Op til 5 hex-strings ("#RRGGBB") til multi-farve gradient på kortet. NULL = single-color via hex_color (bagudkompatibel).';

-- 2) CHECK: array-størrelse skal være 1-5 hvis sat.
--    Brug cardinality() i stedet for array_length() — cardinality returnerer 0 for tomt array,
--    array_length returnerer NULL hvilket smutter forbi CHECK (PostgreSQL: NULL ≠ FALSE).
--    Vi tillader NULL eksplicit; tomt array '{}' er IKKE tilladt (mappers skal sende NULL ved tom).
alter table public.yarn_items
  drop constraint if exists yarn_items_hex_colors_count_check;
alter table public.yarn_items
  add constraint yarn_items_hex_colors_count_check
    check (
      hex_colors is null
      or cardinality(hex_colors) between 1 and 5
    );

-- 3) RLS: arves automatisk fra eksisterende yarn_items-policies (select/insert/update/delete_own).
--    Ingen ny policy nødvendig.

-- 4) Table-level GRANT er allerede på plads for authenticated.
--    Ny kolonne dækkes automatisk. Verificeret mod 20260419000001_rls_yarn_items_and_usage.sql.

commit;

-- Tving PostgREST til at genindlæse schema-cache så select(..., hex_colors) virker.
notify pgrst, 'reload schema';
