import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Map app camelCase fields ↔ DB snake_case columns
// Original yarn_items schema columns (always present):
//   id, user_id, brand, name, color_name, color_code, fiber,
//   yarn_weight, gauge, meters, grams, image_url, barcode, created_at
//
// Extended columns (add via SQL if needed):
//   quantity, status, hex_color, notes
//
// Run this SQL in Supabase to enable all fields:
//   ALTER TABLE public.yarn_items
//     ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
//     ADD COLUMN IF NOT EXISTS status text DEFAULT 'På lager',
//     ADD COLUMN IF NOT EXISTS hex_color text,
//     ADD COLUMN IF NOT EXISTS notes text;

const EXTENDED_COLS_ENABLED = true

export function toDb(yarn) {
  const base = {
    name:        yarn.name        || null,
    brand:       yarn.brand       || null,
    color_name:  yarn.colorName   || null,
    color_code:  yarn.colorCode   || null,
    fiber:       yarn.fiber       || null,
    yarn_weight: yarn.weight      || null,
    gauge:       yarn.pindstr     || null,
    meters:      yarn.metrage     ? Number(yarn.metrage) : null,
    barcode:     yarn.barcode     || null,
  }
  if (EXTENDED_COLS_ENABLED) {
    base.quantity  = yarn.antal  ? parseFloat(yarn.antal) : 1
    base.status    = yarn.status || 'På lager'
    base.hex_color = yarn.hex    || null
    base.notes     = yarn.noter  || null
  }
  return base
}

export function fromDb(row) {
  return {
    id:        row.id,
    name:      row.name,
    brand:     row.brand,
    colorName: row.color_name,
    colorCode: row.color_code,
    fiber:     row.fiber,
    weight:    row.yarn_weight,
    pindstr:   row.gauge,
    metrage:   row.meters,
    antal:     row.quantity  ?? 1,
    status:    row.status    ?? 'På lager',
    hex:       row.hex_color ?? '#A8C4C4',
    noter:     row.notes     ?? '',
    barcode:   row.barcode,
  }
}
