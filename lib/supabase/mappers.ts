// camelCase ↔ snake_case mappers for yarn_items, yarn_usage og projects.
// Bruges udelukkende af SPA-komponenter (Garnlager, Arkiv, BrugNoeglerModal).

import { dedupeYarnNameFromBrand } from '@/lib/yarn-display'

// ── yarn_items ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDb(yarn: Record<string, any>) {
  // Tomt array sendes som NULL — DB-CHECK afviser tomme arrays.
  const hexColors = Array.isArray(yarn.hexColors) && yarn.hexColors.length > 0
    ? yarn.hexColors
    : null
  // Brugt op-felter persisteres kun når status faktisk er "Brugt op".
  // Skift FRA "Brugt op" til anden status nulstiller ikke felterne automatisk —
  // det er bevidst, så historik bevares.
  const isBrugtOp = yarn.status === 'Brugt op'
  return {
    name:            yarn.name          || null,
    brand:           yarn.brand         || null,
    color_name:      yarn.colorName     || null,
    color_code:      yarn.colorCode     || null,
    color_category:  yarn.colorCategory || null,
    fiber:           yarn.fiber         || null,
    yarn_weight:     yarn.weight        || null,
    gauge:           yarn.pindstr       || null,
    meters:          yarn.metrage       ? Number(yarn.metrage) : null,
    barcode:         yarn.barcode       || null,
    image_url:       yarn.imageUrl      ?? null,
    quantity:        isBrugtOp ? 0 : (yarn.antal ? parseFloat(yarn.antal) : 1),
    status:          yarn.status        || 'På lager',
    hex_color:       yarn.hex           || null,
    hex_colors:      hexColors,
    notes:           yarn.noter         || null,
    brugt_til_projekt: isBrugtOp ? (yarn.brugtTilProjekt || null) : null,
    brugt_op_dato:     isBrugtOp ? (yarn.brugtOpDato     || null) : null,
    catalog_yarn_id:   yarn.catalogYarnId   ?? null,
    catalog_color_id:  yarn.catalogColorId  ?? null,
    catalog_image_url: yarn.catalogImageUrl ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDb(row: Record<string, any>) {
  return {
    id:             row.id,
    name:           row.name,
    brand:          row.brand,
    colorName:      row.color_name,
    colorCode:      row.color_code,
    colorCategory:  row.color_category  ?? null,
    fiber:          row.fiber,
    weight:         row.yarn_weight,
    pindstr:        row.gauge,
    metrage:        row.meters,
    antal:          row.quantity        ?? 1,
    status:         row.status          ?? 'På lager',
    hex:            row.hex_color       ?? '',
    hexColors:      Array.isArray(row.hex_colors) ? row.hex_colors : [],
    noter:          row.notes           ?? '',
    barcode:        row.barcode,
    imageUrl:       row.image_url       ?? null,
    brugtTilProjekt: row.brugt_til_projekt ?? '',
    brugtOpDato:     row.brugt_op_dato     ?? '',
    catalogYarnId:   row.catalog_yarn_id   ?? null,
    catalogColorId:  row.catalog_color_id  ?? null,
    catalogImageUrl: row.catalog_image_url ?? null,
  }
}

// ── markYarnAsBrugtOp ─────────────────────────────────────────────────────────
//
// Helper der atomar markerer et garn som "Brugt op". Bruges af både F5's
// folde-ud-flow og fremtidig F15 bidirektional kobling (hvor et projekt
// markeres færdigt og garnet automatisk skal nedskrives til 0).
//
// Sætter status='Brugt op', quantity=0 og persisterer projekt-navn + dato.
// Returnerer den opdaterede række eller kaster fejl.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markYarnAsBrugtOp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  yarnId: string,
  brugtTilProjekt: string,
  brugtOpDato: string,
) {
  const { data, error } = await supabase
    .from('yarn_items')
    .update({
      status:            'Brugt op',
      quantity:          0,
      brugt_til_projekt: brugtTilProjekt || null,
      brugt_op_dato:     brugtOpDato     || null,
    })
    .eq('id', yarnId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── yarn_usage ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toUsageDb(u: Record<string, any>) {
  // Invariant: yarn_name må ikke indeholde brand-præfix (giver "Permin Permin Hannah"
  // i projekt-views når brand+name renderes sammen). Defensiv strip her dækker
  // alle skrive-call-sites ét sted i stedet for at jagte hver onSelectYarn.
  const yarnName = u.yarnName != null && u.yarnBrand
    ? dedupeYarnNameFromBrand(String(u.yarnName), String(u.yarnBrand))
    : (u.yarnName ?? null)
  return {
    project_id:        u.projectId      ?? null,
    yarn_item_id:      u.yarnItemId     ?? null,
    yarn_name:         yarnName         ?? null,
    yarn_brand:        u.yarnBrand      ?? null,
    color_name:        u.colorName      ?? null,
    color_code:        u.colorCode      ?? null,
    hex_color:         u.hex            ?? null,
    catalog_yarn_id:   u.catalogYarnId  ?? null,
    catalog_color_id:  u.catalogColorId ?? null,
    quantity_used:     u.quantityUsed   ? parseFloat(u.quantityUsed) : null,
    used_for:          u.usedFor        ?? null,
    needle_size:       u.needleSize     ?? null,
    held_with:         u.heldWith       ?? null,
    notes:             u.notes          ?? null,
    project_image_url: u.projectImageUrl ?? null,
    pattern_pdf_url:   u.patternPdfUrl  ?? null,
    used_at:           u.usedAt         ?? new Date().toISOString().slice(0, 10),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromUsageDb(row: Record<string, any>) {
  return {
    id:              row.id,
    projectId:       row.project_id      ?? null,
    yarnItemId:      row.yarn_item_id,
    yarnName:        row.yarn_name,
    yarnBrand:       row.yarn_brand,
    colorName:       row.color_name,
    colorCode:       row.color_code,
    hex:             row.hex_color        ?? '#A8C4C4',
    catalogYarnId:   row.catalog_yarn_id  ?? null,
    catalogColorId:  row.catalog_color_id ?? null,
    // F11 2026-04-28: rund til nærmeste 0.5 så historisk 0.25/0.75-data
    // vises konsistent med ny step=0.5-stepper. DB-værdien bevares uændret.
    quantityUsed:    roundToHalfStep(row.quantity_used),
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

function roundToHalfStep(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return null
  return Math.round(n * 2) / 2
}
