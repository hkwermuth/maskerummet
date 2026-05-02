-- Omdøber fiber-enum-værdien 'lin' til 'hør' (det danske ord).
-- ALTER TYPE ... RENAME VALUE er atomær og opdaterer alle rækker der bruger
-- enum-værdien (yarn_fiber_components.fiber). Ingen data-ændring nødvendig.

ALTER TYPE public.fiber_type RENAME VALUE 'lin' TO 'hør';
