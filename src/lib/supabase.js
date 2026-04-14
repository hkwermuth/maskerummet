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
//   quantity, status, hex_color, notes, catalog_yarn_id, catalog_color_id, catalog_image_url
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
    name:           yarn.name          || null,
    brand:          yarn.brand         || null,
    color_name:     yarn.colorName     || null,
    color_code:     yarn.colorCode     || null,
    color_category: yarn.colorCategory || null,
    fiber:          yarn.fiber         || null,
    yarn_weight:    yarn.weight        || null,
    gauge:          yarn.pindstr       || null,
    meters:         yarn.metrage       ? Number(yarn.metrage) : null,
    barcode:        yarn.barcode       || null,
    image_url:      yarn.imageUrl      ?? null,
  }
  if (EXTENDED_COLS_ENABLED) {
    base.quantity  = yarn.antal  ? parseFloat(yarn.antal) : 1
    base.status    = yarn.status || 'På lager'
    base.hex_color = yarn.hex    || null
    base.notes     = yarn.noter  || null
    base.catalog_yarn_id  = yarn.catalogYarnId  ?? null
    base.catalog_color_id = yarn.catalogColorId ?? null
    base.catalog_image_url = yarn.catalogImageUrl ?? null
  }
  return base
}

// ── yarn_usage mapping ────────────────────────────────────────────────────────

export function toUsageDb(u) {
  return {
    project_id:        u.projectId      ?? null,
    yarn_item_id:      u.yarnItemId      ?? null,
    yarn_name:         u.yarnName        ?? null,
    yarn_brand:        u.yarnBrand       ?? null,
    color_name:        u.colorName       ?? null,
    color_code:        u.colorCode       ?? null,
    hex_color:         u.hex             ?? null,
    catalog_yarn_id:   u.catalogYarnId   ?? null,
    catalog_color_id:  u.catalogColorId  ?? null,
    quantity_used:     u.quantityUsed    ? parseFloat(u.quantityUsed) : null,
    used_for:          u.usedFor         ?? null,
    needle_size:       u.needleSize      ?? null,
    held_with:         u.heldWith        ?? null,
    notes:             u.notes           ?? null,
    project_image_url: u.projectImageUrl ?? null,
    pattern_pdf_url:   u.patternPdfUrl   ?? null,
    used_at:           u.usedAt          ?? new Date().toISOString().slice(0, 10),
  }
}

export function fromUsageDb(row) {
  return {
    id:              row.id,
    projectId:       row.project_id ?? null,
    yarnItemId:      row.yarn_item_id,
    yarnName:        row.yarn_name,
    yarnBrand:       row.yarn_brand,
    colorName:       row.color_name,
    colorCode:       row.color_code,
    hex:             row.hex_color ?? '#A8C4C4',
    catalogYarnId:   row.catalog_yarn_id ?? null,
    catalogColorId:  row.catalog_color_id ?? null,
    quantityUsed:    row.quantity_used,
    usedFor:         row.used_for,
    needleSize:      row.needle_size,
    heldWith:        row.held_with,
    notes:           row.notes,
    projectImageUrl: row.project_image_url,
    patternPdfUrl:   row.pattern_pdf_url,
    usedAt:          row.used_at,
    createdAt:       row.created_at,
  }
}

// ── Storage helpers ────────────────────────────────────────────────────────────

export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  // For private buckets, create a signed URL instead
  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365)
  return signed?.signedUrl ?? publicUrl
}

export async function deleteFile(bucket, path) {
  await supabase.storage.from(bucket).remove([path])
}

export function fromDb(row) {
  return {
    id:            row.id,
    name:          row.name,
    brand:         row.brand,
    colorName:     row.color_name,
    colorCode:     row.color_code,
    colorCategory: row.color_category ?? null,
    fiber:         row.fiber,
    weight:        row.yarn_weight,
    pindstr:       row.gauge,
    metrage:       row.meters,
    antal:         row.quantity  ?? 1,
    status:        row.status    ?? 'På lager',
    hex:           row.hex_color ?? '',
    noter:         row.notes     ?? '',
    barcode:       row.barcode,
    imageUrl:      row.image_url ?? null,
    catalogYarnId:  row.catalog_yarn_id  ?? null,
    catalogColorId: row.catalog_color_id ?? null,
    catalogImageUrl: row.catalog_image_url ?? null,
  }
}
