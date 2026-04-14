-- Link stash (yarn_items / yarn_usage) to garn-katalog (yarns / colors).
-- Run in Supabase SQL Editor (once per project).
-- RLS: ensure authenticated users can SELECT public.yarns_full / yarns / colors as needed for the Vite app;
--       yarn_items / yarn_usage policies should allow insert/update with these FK columns.

-- ── colors: per-color barcode (EAN) ─────────────────────────────────────────
ALTER TABLE public.colors
  ADD COLUMN IF NOT EXISTS barcode text;

CREATE UNIQUE INDEX IF NOT EXISTS colors_barcode_unique
  ON public.colors (barcode)
  WHERE barcode IS NOT NULL AND btrim(barcode) <> '';

CREATE INDEX IF NOT EXISTS colors_yarn_id_idx ON public.colors (yarn_id);

-- ── yarn_items: catalog links + fractional quantities ─────────────────────
ALTER TABLE public.yarn_items
  ADD COLUMN IF NOT EXISTS catalog_yarn_id uuid,
  ADD COLUMN IF NOT EXISTS catalog_color_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'yarn_items'
      AND column_name = 'quantity' AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.yarn_items
      ALTER COLUMN quantity TYPE numeric(10,2) USING quantity::numeric;
  END IF;
END $$;

ALTER TABLE public.yarn_items
  ADD COLUMN IF NOT EXISTS quantity numeric(10,2) DEFAULT 1;

ALTER TABLE public.yarn_items
  DROP CONSTRAINT IF EXISTS yarn_items_catalog_yarn_id_fkey,
  ADD CONSTRAINT yarn_items_catalog_yarn_id_fkey
    FOREIGN KEY (catalog_yarn_id) REFERENCES public.yarns (id) ON DELETE SET NULL;

ALTER TABLE public.yarn_items
  DROP CONSTRAINT IF EXISTS yarn_items_catalog_color_id_fkey,
  ADD CONSTRAINT yarn_items_catalog_color_id_fkey
    FOREIGN KEY (catalog_color_id) REFERENCES public.colors (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS yarn_items_catalog_yarn_id_idx ON public.yarn_items (catalog_yarn_id);
CREATE INDEX IF NOT EXISTS yarn_items_catalog_color_id_idx ON public.yarn_items (catalog_color_id);

-- ── yarn_usage: catalog refs + fractional quantity_used ─────────────────────
ALTER TABLE public.yarn_usage
  ADD COLUMN IF NOT EXISTS catalog_yarn_id uuid,
  ADD COLUMN IF NOT EXISTS catalog_color_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'yarn_usage'
      AND column_name = 'quantity_used' AND data_type <> 'numeric'
  ) THEN
    ALTER TABLE public.yarn_usage
      ALTER COLUMN quantity_used TYPE numeric(10,2) USING quantity_used::numeric;
  END IF;
END $$;

ALTER TABLE public.yarn_usage
  DROP CONSTRAINT IF EXISTS yarn_usage_catalog_yarn_id_fkey,
  ADD CONSTRAINT yarn_usage_catalog_yarn_id_fkey
    FOREIGN KEY (catalog_yarn_id) REFERENCES public.yarns (id) ON DELETE SET NULL;

ALTER TABLE public.yarn_usage
  DROP CONSTRAINT IF EXISTS yarn_usage_catalog_color_id_fkey,
  ADD CONSTRAINT yarn_usage_catalog_color_id_fkey
    FOREIGN KEY (catalog_color_id) REFERENCES public.colors (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS yarn_usage_catalog_yarn_id_idx ON public.yarn_usage (catalog_yarn_id);
CREATE INDEX IF NOT EXISTS yarn_usage_catalog_color_id_idx ON public.yarn_usage (catalog_color_id);
