-- Katalogbillede (colors.image_url kopieret ved valg af farve) til lager-kort uden eget upload.
-- Kør i Supabase SQL Editor efter stash_catalog_link.sql.

ALTER TABLE public.yarn_items
  ADD COLUMN IF NOT EXISTS catalog_image_url text;

COMMENT ON COLUMN public.yarn_items.catalog_image_url IS 'URL fra colors.image_url når lager er linket til katalogfarve';
