import { supabase } from './supabase'

/** Display name for a yarn row from `yarns_full`. */
export function displayYarnName(yarn) {
  if (!yarn) return ''
  return yarn.full_name || [yarn.name, yarn.series].filter(Boolean).join(' — ')
}

export function metrageFromYarn(yarn) {
  if (!yarn?.ball_weight_g || !yarn?.length_per_100g_m) return ''
  return Math.round((yarn.ball_weight_g * yarn.length_per_100g_m) / 100)
}

export function pindstrFromYarn(yarn) {
  if (!yarn) return ''
  if (yarn.needle_min_mm != null && yarn.needle_max_mm != null) {
    return `${yarn.needle_min_mm}-${yarn.needle_max_mm}`
  }
  if (yarn.gauge_needle_mm != null) return String(yarn.gauge_needle_mm)
  return ''
}

function normalizeHex(hex) {
  if (!hex) return ''
  const s = String(hex).trim()
  return s.startsWith('#') ? s : `#${s}`
}

/**
 * Kun garn fra katalog — ingen farve valgt endnu (tomme farvefelter).
 */
export function applyCatalogYarnOnlyToForm(yarn, prev = {}) {
  return {
    ...prev,
    name: displayYarnName(yarn),
    brand: yarn.producer ?? '',
    colorName: '',
    colorCode: '',
    colorCategory: '',
    fiber: yarn.fiber_main ?? '',
    weight: yarn.thickness_category || prev.weight || 'DK',
    metrage: metrageFromYarn(yarn) || prev.metrage,
    pindstr: pindstrFromYarn(yarn) || prev.pindstr,
    hex: '',
    catalogYarnId: yarn.id,
    catalogColorId: null,
    catalogImageUrl: null,
  }
}

/**
 * Merge catalog yarn + color into stash form fields.
 * @param {object} yarn - row from `yarns_full`
 * @param {object|null} color - row from `colors` (optional)
 * @param {object} prev - previous form slice to preserve keys like antal, status
 */
export function applyCatalogYarnColorToForm(yarn, color, prev = {}) {
  const hex = color?.hex_code ? normalizeHex(color.hex_code) : (prev.hex || '')
  return {
    ...prev,
    name: displayYarnName(yarn),
    brand: yarn.producer ?? '',
    colorName: color?.color_name ?? '',
    colorCode: color?.color_number ?? '',
    fiber: yarn.fiber_main ?? '',
    weight: yarn.thickness_category || prev.weight || 'DK',
    metrage: metrageFromYarn(yarn) || prev.metrage,
    pindstr: pindstrFromYarn(yarn) || prev.pindstr,
    hex,
    catalogYarnId: yarn.id,
    catalogColorId: color?.id ?? null,
    catalogImageUrl: color?.image_url ?? null,
  }
}

const YARN_FULL_SELECT =
  'id,producer,name,series,full_name,fiber_main,thickness_category,ball_weight_g,length_per_100g_m,needle_min_mm,needle_max_mm,gauge_needle_mm,color_count'

/**
 * Search public catalog yarns (debounced by caller).
 * @param {string} q
 */
export async function searchYarnsFull(q) {
  const t = (q || '').trim()
  if (t.length < 1) return []
  const esc = t.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
  const p = `%${esc}%`
  const [fullName, producer, name] = await Promise.all([
    supabase.from('yarns_full').select(YARN_FULL_SELECT).ilike('full_name', p).order('producer').order('name').limit(20),
    supabase.from('yarns_full').select(YARN_FULL_SELECT).ilike('producer', p).order('producer').order('name').limit(20),
    supabase.from('yarns_full').select(YARN_FULL_SELECT).ilike('name', p).order('producer').order('name').limit(20),
  ])
  const err = fullName.error || producer.error || name.error
  if (err) {
    console.error('searchYarnsFull:', err.message)
    return []
  }
  const map = new Map()
  for (const row of [...(fullName.data ?? []), ...(producer.data ?? []), ...(name.data ?? [])]) {
    map.set(row.id, row)
  }
  return [...map.values()].slice(0, 20)
}

export async function fetchYarnFullById(id) {
  if (!id) return null
  const { data, error } = await supabase
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

export async function fetchColorsForYarn(yarnId) {
  if (!yarnId) return []
  const { data, error } = await supabase
    .from('colors')
    .select('id,yarn_id,color_number,color_name,hex_code,barcode,image_url')
    .eq('yarn_id', yarnId)
    .order('color_number')
  if (error) {
    console.error('fetchColorsForYarn:', error.message)
    return []
  }
  return data ?? []
}

export async function fetchColorsByIds(ids) {
  const uniq = [...new Set((ids ?? []).filter(Boolean))]
  if (uniq.length === 0) return new Map()
  const { data, error } = await supabase
    .from('colors')
    .select('id,yarn_id,color_number,color_name,hex_code,barcode,image_url')
    .in('id', uniq)
  if (error) {
    console.error('fetchColorsByIds:', error.message)
    return new Map()
  }
  const map = new Map()
  for (const row of data ?? []) map.set(row.id, row)
  return map
}

/**
 * Resolve barcode to catalog color + yarn; returns { yarn, color } or null.
 */
export async function resolveBarcodeToCatalog(code) {
  const raw = (code || '').trim()
  if (!raw) return null
  const { data: colorRow, error: cErr } = await supabase
    .from('colors')
    .select('id,yarn_id,color_number,color_name,hex_code,barcode,image_url')
    .eq('barcode', raw)
    .maybeSingle()
  if (cErr) {
    console.error('resolveBarcodeToCatalog:', cErr.message)
    return null
  }
  if (!colorRow) return null
  const yarn = await fetchYarnFullById(colorRow.yarn_id)
  if (!yarn) return null
  return { yarn, color: colorRow }
}
