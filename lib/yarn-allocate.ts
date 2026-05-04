// Helpers til at allokere garn fra "Mit garn"-lageret til et projekt og
// til at splitte en lagerrække når brugeren ændrer status for kun en del af
// nøglerne (fx 5 ud af 10 nøgler skal i status "I brug").
//
// Modsætning til lib/yarn-return.ts:
//   yarn-return.ts:  projekt → lager (tilbageførsel ved fjernelse / drop)
//   yarn-allocate.ts: lager → projekt (forbrug ved tilføjelse / færdiggørelse)
//
// Kerne-invariant: på tværs af et garn-identitet (samme yarn_item_id, eller
// samme catalog_color_id, eller samme brand+colorName+colorCode) er
// "summen af antal nøgler" konstant. At allokere flytter mellem rækker, ikke
// imod en uafhængig "brugt"-tæller.

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Typer ─────────────────────────────────────────────────────────────────────

export type AllocatableLine = {
  yarnItemId:     string | null      // FK til yarn_items hvis valgt fra "Mit garn"
  yarnName:       string | null
  yarnBrand:      string | null
  colorName:      string | null
  colorCode:      string | null
  hex:            string | null
  catalogYarnId:  string | null
  catalogColorId: string | null
}

export type MatchKind = 'by-yarn-item-id' | 'by-catalog-color' | 'by-name-color'

export type InUseMatch = {
  yarnItemId:      string
  currentQuantity: number
  matchKind:       MatchKind
}

export type AllocateResult = {
  inUseYarnItemId: string             // id på "I brug"-rækken (ny eller eksisterende)
  decrementedFrom: string             // id på source-rækken hvor antal blev trukket
  merged:          boolean            // true hvis vi forøgede en eksisterende I-brug-række
}

export type SplitResult = {
  sourceYarnItemId: string            // id på den oprindelige række (med reduceret antal)
  newYarnItemId:    string            // id på den nye række (med splittet antal + ny status)
}

// ── Stock-validering (UI-side, før gem) ──────────────────────────────────────

export type StockValidationResult = {
  valid:           boolean
  reason?:         'no-source' | 'insufficient-stock'
  available?:      number   // antal på lager hvis source er en På lager-række
  requested?:      number
}

/**
 * Validerer en projekt-linje mod brugerens lager FØR allokering forsøges.
 * Kører client-side så vi kan vise inline-fejl + disable gem-knap.
 *
 * Regler:
 *   - Hvis line.yarnItemId mangler eller ikke findes i userYarnItems: invalid (no-source).
 *   - Hvis source er "På lager" og requested > available: invalid (insufficient-stock).
 *   - Hvis source er "I brug" (allerede allokeret tidligere): vi validerer ikke
 *     mod stock her — det håndteres ved delta-beregning i Arkiv.jsx ved gem.
 *   - Hvis source er noget andet (Brugt op, Ønskeliste): valid (vi rører ikke ved den).
 */
export function validateLineStock(
  line:           { yarnItemId: string | null; quantityUsed: number | null },
  userYarnItems:  Array<{ id: string; status: string; antal: number | null }>,
): StockValidationResult {
  if (!line.yarnItemId) {
    return { valid: true }
  }
  const source = userYarnItems.find(y => y.id === line.yarnItemId)
  if (!source) {
    return { valid: false, reason: 'no-source' }
  }
  if (source.status !== 'På lager') {
    return { valid: true }
  }
  const requested = Number(line.quantityUsed ?? 0)
  const available = Number(source.antal ?? 0)
  if (requested > available) {
    return { valid: false, reason: 'insufficient-stock', available, requested }
  }
  return { valid: true, available, requested }
}

// ── Match-helpers ─────────────────────────────────────────────────────────────

function nonEmpty(s: string | null | undefined): s is string {
  return typeof s === 'string' && s.trim() !== ''
}

/**
 * Find en eksisterende "I brug"-yarn_items-række for samme garn-identitet,
 * så vi kan merge i stedet for at oprette dubletter når brugeren allokerer
 * det samme garn flere gange. Match-rækkefølge:
 *
 *   1. catalog_color_id (samme katalog-farve)
 *   2. case-insensitive brand + color_name + color_code (alle tre kræves)
 *
 * Rækker med status='Brugt op' springes over — historik må ikke "genoplives".
 *
 * Bemærk at vi IKKE matcher på source-rækkens id direkte — vi vil have en
 * SEPARAT row med status='I brug'. Source-rækken bevarer 'På lager'.
 */
export async function findInUseRowMatch(
  supabase: SupabaseClient,
  userId:   string,
  line:     AllocatableLine,
): Promise<InUseMatch | null> {
  // 1) catalog_color_id
  if (line.catalogColorId) {
    const { data } = await supabase
      .from('yarn_items')
      .select('id, quantity, status')
      .eq('user_id', userId)
      .eq('catalog_color_id', line.catalogColorId)
      .eq('status', 'I brug')
      .limit(1)
    const row = (data ?? [])[0] as { id: string; quantity: number | null; status: string } | undefined
    if (row) {
      return {
        yarnItemId:      row.id,
        currentQuantity: Number(row.quantity ?? 0),
        matchKind:       'by-catalog-color',
      }
    }
  }

  // 2) brand + color_name + color_code (alle tre ikke-tomme)
  if (nonEmpty(line.yarnBrand) && nonEmpty(line.colorName) && nonEmpty(line.colorCode)) {
    const { data } = await supabase
      .from('yarn_items')
      .select('id, quantity, status')
      .eq('user_id', userId)
      .eq('status', 'I brug')
      .ilike('brand', line.yarnBrand)
      .ilike('color_name', line.colorName)
      .ilike('color_code', line.colorCode)
      .limit(1)
    const row = (data ?? [])[0] as { id: string; quantity: number | null; status: string } | undefined
    if (row) {
      return {
        yarnItemId:      row.id,
        currentQuantity: Number(row.quantity ?? 0),
        matchKind:       'by-name-color',
      }
    }
  }

  return null
}

// ── Decrement (race-safe) ────────────────────────────────────────────────────

/**
 * Trækker `qty` fra source-rækkens quantity. Race-safe: bruger en `gte`-clause
 * så samtidige updates fejler hellere end at gå negativt.
 *
 * Returnerer den nye quantity, eller kaster hvis 0 rækker blev opdateret
 * (hvilket sker hvis source er forsvundet eller ikke har nok på lager).
 */
export async function decrementYarnItemQuantity(
  supabase:    SupabaseClient,
  userId:      string,
  yarnItemId:  string,
  qty:         number,
): Promise<number> {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('decrementYarnItemQuantity: qty skal være > 0')
  }

  // Hent nuværende quantity først så vi kan lave atomar update med ny værdi.
  // (Supabase REST har ikke direkte SQL-ekspression-update på client-side.)
  const { data: current, error: fetchErr } = await supabase
    .from('yarn_items')
    .select('quantity')
    .eq('id', yarnItemId)
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (!current) {
    throw new Error('decrementYarnItemQuantity: source-rækken findes ikke')
  }
  const currentQty = Number((current as { quantity: number | null }).quantity ?? 0)
  if (currentQty < qty) {
    throw new Error(`decrementYarnItemQuantity: utilstrækkeligt antal på lager (${currentQty} < ${qty})`)
  }

  const newQty = currentQty - qty
  const { data: updated, error: updErr } = await supabase
    .from('yarn_items')
    .update({ quantity: newQty })
    .eq('id', yarnItemId)
    .eq('user_id', userId)
    .gte('quantity', qty)            // race-guard: andet samtidigt update kan have reduceret
    .select('id, quantity')
  if (updErr) throw updErr
  if (!updated || updated.length === 0) {
    throw new Error('decrementYarnItemQuantity: race detected — quantity ændret af anden session')
  }
  return Number((updated[0] as { quantity: number | null }).quantity ?? 0)
}

// ── Allokering ────────────────────────────────────────────────────────────────

/**
 * Allokér `qty` nøgler fra source-yarn_item til et projekt. Decrementer
 * source-rækken, finder eller opretter en "I brug"-række og opretter en
 * yarn_usage-row der linker det hele til projektet.
 *
 * Bemærk: yarn_usage-rækken's yarn_item_id peger på "I brug"-rækken (ikke
 * source). Det matcher den semantik at "garn der er brugt i projekt" =
 * "I brug"-status, og gør at returnerings-flow (via yarnItemId-match)
 * tilfører tilbage til samme I-brug-række.
 */
export async function allocateYarnToProject(
  supabase:    SupabaseClient,
  userId:      string,
  source:      AllocatableLine & { yarnItemId: string },
  projectId:   string,
  qty:         number,
): Promise<AllocateResult> {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('allocateYarnToProject: qty skal være > 0')
  }

  // 1) Decrement source. Fejler hvis ikke nok på lager.
  await decrementYarnItemQuantity(supabase, userId, source.yarnItemId, qty)

  // 2) Find eksisterende "I brug"-række eller opret ny.
  const match = await findInUseRowMatch(supabase, userId, source)
  let inUseYarnItemId: string
  let merged = false

  if (match) {
    const newQty = match.currentQuantity + qty
    const { data: updated, error: updErr } = await supabase
      .from('yarn_items')
      .update({ quantity: newQty })
      .eq('id', match.yarnItemId)
      .eq('user_id', userId)
      .select('id')
    if (updErr) throw updErr
    if (!updated || updated.length === 0) {
      // I-brug-rækken er forsvundet imellem find og update — fald igennem til insert.
      inUseYarnItemId = await createInUseRow(supabase, userId, source, qty, projectId)
    } else {
      inUseYarnItemId = match.yarnItemId
      merged = true
    }
  } else {
    inUseYarnItemId = await createInUseRow(supabase, userId, source, qty, projectId)
  }

  return {
    inUseYarnItemId,
    decrementedFrom: source.yarnItemId,
    merged,
  }
}

async function createInUseRow(
  supabase:   SupabaseClient,
  userId:     string,
  source:     AllocatableLine,
  qty:        number,
  projectId:  string,
): Promise<string> {
  // Hent source-rækken så vi kan kopiere metadata (fiber, weight, hex_colors,
  // notes, image_url, gauge, meters) som ikke er på AllocatableLine.
  let metadata: Record<string, unknown> = {}
  if (source.yarnItemId) {
    const { data: src } = await supabase
      .from('yarn_items')
      .select('fiber, yarn_weight, hex_colors, notes, image_url, gauge, meters, color_category')
      .eq('id', source.yarnItemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (src) {
      metadata = {
        fiber:          (src as { fiber: string | null }).fiber          ?? null,
        yarn_weight:    (src as { yarn_weight: string | null }).yarn_weight ?? null,
        hex_colors:     (src as { hex_colors: string[] | null }).hex_colors ?? null,
        notes:          (src as { notes: string | null }).notes ?? null,
        image_url:      (src as { image_url: string | null }).image_url ?? null,
        gauge:          (src as { gauge: string | null }).gauge ?? null,
        meters:         (src as { meters: number | null }).meters ?? null,
        color_category: (src as { color_category: string | null }).color_category ?? null,
      }
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from('yarn_items')
    .insert([{
      ...metadata,
      user_id:                userId,
      name:                   source.yarnName ?? null,
      brand:                  source.yarnBrand ?? null,
      color_name:             source.colorName ?? null,
      color_code:             source.colorCode ?? null,
      hex_color:              source.hex ?? null,
      quantity:               qty,
      status:                 'I brug',
      catalog_yarn_id:        source.catalogYarnId ?? null,
      catalog_color_id:       source.catalogColorId ?? null,
      brugt_til_projekt_id:   projectId,
    }])
    .select('id')
    .single()
  if (insErr) throw insErr
  return (inserted as { id: string }).id
}

// ── Splitting (status-skift på dele af en række) ─────────────────────────────

/**
 * Splitter en yarn_items-række: trækker `qty` fra source-rækken og opretter
 * en ny række med samme metadata men `qty` antal og `newStatus`.
 *
 * Bruges når brugeren editerer en lagerrække og kun vil flytte fx 5 ud af
 * 10 nøgler til en ny status. Resten bliver i source-rækken med uændret
 * status.
 *
 * Hvis qty === source.quantity sker ingen split — i stedet opdateres source-
 * rækkens status direkte. Hvis qty > source.quantity kastes fejl.
 */
export async function splitYarnItemRow(
  supabase:   SupabaseClient,
  userId:     string,
  sourceId:   string,
  qty:        number,
  newStatus:  string,
  // Ekstra kolonner der følger med den nye status (fx brugt_til_projekt_id).
  extraOnNew: Record<string, unknown> = {},
): Promise<SplitResult> {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('splitYarnItemRow: qty skal være > 0')
  }

  // Hent fuld source-row så vi kan kopiere metadata.
  const { data: src, error: fetchErr } = await supabase
    .from('yarn_items')
    .select('*')
    .eq('id', sourceId)
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (!src) throw new Error('splitYarnItemRow: source-rækken findes ikke')

  const srcRow = src as Record<string, unknown>
  const currentQty = Number((srcRow.quantity as number | null) ?? 0)
  if (currentQty < qty) {
    throw new Error(`splitYarnItemRow: source har kun ${currentQty}, kan ikke splitte ${qty}`)
  }

  // Hvis vi tager ALLE nøgler: ingen split — bare update status på source-rækken.
  if (currentQty === qty) {
    const { error: updErr } = await supabase
      .from('yarn_items')
      .update({ status: newStatus, ...extraOnNew })
      .eq('id', sourceId)
      .eq('user_id', userId)
    if (updErr) throw updErr
    return { sourceYarnItemId: sourceId, newYarnItemId: sourceId }
  }

  // Decrement source race-safe.
  await decrementYarnItemQuantity(supabase, userId, sourceId, qty)

  // Insert ny række med kopieret metadata + nyt antal + ny status.
  const inheritedKeys = [
    'name', 'brand', 'color_name', 'color_code', 'color_category',
    'fiber', 'yarn_weight', 'hex_color', 'hex_colors', 'notes',
    'gauge', 'meters', 'image_url', 'barcode',
    'catalog_yarn_id', 'catalog_color_id', 'catalog_image_url',
  ] as const
  const inherited: Record<string, unknown> = {}
  for (const k of inheritedKeys) {
    if (k in srcRow) inherited[k] = srcRow[k]
  }

  const { data: inserted, error: insErr } = await supabase
    .from('yarn_items')
    .insert([{
      ...inherited,
      user_id:  userId,
      quantity: qty,
      status:   newStatus,
      ...extraOnNew,
    }])
    .select('id')
    .single()
  if (insErr) throw insErr

  return {
    sourceYarnItemId: sourceId,
    newYarnItemId:    (inserted as { id: string }).id,
  }
}
