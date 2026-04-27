import type { SupabaseClient } from '@supabase/supabase-js'

// Alle catalog-søgefunktioner tager en Supabase-klient som parameter
// så de kan bruges både klient-side (browser client) og server-side (public client).

const YARN_FULL_SELECT =
  'id,producer,name,series,full_name,fiber_main,thickness_category,ball_weight_g,length_per_100g_m,needle_min_mm,needle_max_mm,gauge_needle_mm,color_count'

/** Vis-navn for et garn fra `yarns_full`. */
export function displayYarnName(yarn: { full_name?: string; name?: string; series?: string | null } | null): string {
  if (!yarn) return ''
  return yarn.full_name || [yarn.name, yarn.series].filter(Boolean).join(' — ')
}

export function metrageFromYarn(yarn: { ball_weight_g?: number | null; length_per_100g_m?: number | null } | null): number | string {
  if (!yarn?.ball_weight_g || !yarn?.length_per_100g_m) return ''
  return Math.round((yarn.ball_weight_g * yarn.length_per_100g_m) / 100)
}

export function pindstrFromYarn(yarn: { needle_min_mm?: number | null; needle_max_mm?: number | null; gauge_needle_mm?: number | null } | null): string {
  if (!yarn) return ''
  if (yarn.needle_min_mm != null && yarn.needle_max_mm != null) {
    return `${yarn.needle_min_mm}-${yarn.needle_max_mm}`
  }
  if (yarn.gauge_needle_mm != null) return String(yarn.gauge_needle_mm)
  return ''
}

function normalizeHex(hex: string | null | undefined): string {
  if (!hex) return ''
  const s = String(hex).trim()
  return s.startsWith('#') ? s : `#${s}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YarnRow = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ColorRow = Record<string, any>

/** Kun garn fra katalog — ingen farve valgt endnu (tomme farvefelter). */
export function applyCatalogYarnOnlyToForm(yarn: YarnRow, prev: YarnRow = {}): YarnRow {
  return {
    ...prev,
    name:           displayYarnName(yarn),
    brand:          yarn.producer        ?? '',
    colorName:      '',
    colorCode:      '',
    colorCategory:  '',
    fiber:          yarn.fiber_main      ?? '',
    weight:         yarn.thickness_category || prev.weight || 'DK',
    metrage:        metrageFromYarn(yarn) || prev.metrage,
    pindstr:        pindstrFromYarn(yarn) || prev.pindstr,
    hex:            '',
    catalogYarnId:  yarn.id,
    catalogColorId: null,
    catalogImageUrl: null,
  }
}

/** Merge katalog-garn + farve ind i stash-formular-felter. */
export function applyCatalogYarnColorToForm(yarn: YarnRow, color: ColorRow | null, prev: YarnRow = {}): YarnRow {
  const hex = color?.hex_code ? normalizeHex(color.hex_code) : (prev.hex || '')
  return {
    ...prev,
    name:           displayYarnName(yarn),
    brand:          yarn.producer        ?? '',
    colorName:      color?.color_name    ?? '',
    colorCode:      color?.color_number  ?? '',
    fiber:          yarn.fiber_main      ?? '',
    weight:         yarn.thickness_category || prev.weight || 'DK',
    metrage:        metrageFromYarn(yarn) || prev.metrage,
    pindstr:        pindstrFromYarn(yarn) || prev.pindstr,
    hex,
    catalogYarnId:  yarn.id,
    catalogColorId:  color?.id          ?? null,
    catalogImageUrl: color?.image_url   ?? null,
  }
}

/** Søg i offentligt garnkatalog (debounces hos kalderen). */
export async function searchYarnsFull(client: SupabaseClient, q: string): Promise<YarnRow[]> {
  const t = (q || '').trim()
  if (t.length < 1) return []
  const esc = t.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
  const p = `%${esc}%`
  const [fullName, producer, name] = await Promise.all([
    client.from('yarns_full').select(YARN_FULL_SELECT).ilike('full_name', p).order('producer').order('name').limit(20),
    client.from('yarns_full').select(YARN_FULL_SELECT).ilike('producer', p).order('producer').order('name').limit(20),
    client.from('yarns_full').select(YARN_FULL_SELECT).ilike('name', p).order('producer').order('name').limit(20),
  ])
  const err = fullName.error || producer.error || name.error
  if (err) {
    console.error('searchYarnsFull:', err.message)
    return []
  }
  const map = new Map<string, YarnRow>()
  for (const row of [...(fullName.data ?? []), ...(producer.data ?? []), ...(name.data ?? [])]) {
    map.set(row.id, row)
  }
  return [...map.values()].slice(0, 20)
}

export async function fetchYarnFullById(client: SupabaseClient, id: string | null): Promise<YarnRow | null> {
  if (!id) return null
  const { data, error } = await client
    .from('yarns_full')
    .select(YARN_FULL_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('fetchYarnFullById:', error.message)
    return null
  }
  return data
}

export async function fetchColorsForYarn(
  client: SupabaseClient,
  yarnId: string | null,
  opts?: { includeDiscontinued?: boolean }
): Promise<ColorRow[]> {
  if (!yarnId) return []
  let q = client
    .from('colors')
    .select('id,yarn_id,color_number,color_name,color_family,hex_code,status,barcode,image_url')
    .eq('yarn_id', yarnId)
    .order('color_number')
  if (!opts?.includeDiscontinued) {
    // Postgres NULL-håndtering: .neq() filtrerer ikke NULL fra. Brug or-filter
    // så både aktive og status=null farver passerer (kun 'udgaaet' ekskluderes).
    q = q.or('status.is.null,status.neq.udgaaet')
  }
  const { data, error } = await q
  if (error) {
    console.error('fetchColorsForYarn:', error.message)
    return []
  }
  return data ?? []
}

export async function fetchColorsByIds(client: SupabaseClient, ids: string[]): Promise<Map<string, ColorRow>> {
  const uniq = [...new Set((ids ?? []).filter(Boolean))]
  if (uniq.length === 0) return new Map()
  const { data, error } = await client
    .from('colors')
    .select('id,yarn_id,color_number,color_name,hex_code,barcode,image_url')
    .in('id', uniq)
  if (error) {
    console.error('fetchColorsByIds:', error.message)
    return new Map()
  }
  const map = new Map<string, ColorRow>()
  for (const row of data ?? []) map.set(row.id, row)
  return map
}

/** Opløs stregkode til katalog-farve + garn. Returnerer { yarn, color } eller null. */
export async function resolveBarcodeToCatalog(
  client: SupabaseClient,
  code: string
): Promise<{ yarn: YarnRow; color: ColorRow } | null> {
  const raw = (code || '').trim()
  if (!raw) return null
  const { data: colorRow, error: cErr } = await client
    .from('colors')
    .select('id,yarn_id,color_number,color_name,hex_code,barcode,image_url')
    .eq('barcode', raw)
    .maybeSingle()
  if (cErr) {
    console.error('resolveBarcodeToCatalog:', cErr.message)
    return null
  }
  if (!colorRow) return null
  const yarn = await fetchYarnFullById(client, colorRow.yarn_id)
  if (!yarn) return null
  return { yarn, color: colorRow }
}
