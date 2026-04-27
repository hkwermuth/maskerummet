import { createSupabasePublicClient } from './supabase/public'
import type { YarnCombination, YarnPartner } from './types'

// Forsvars-i-dybde: yarnId kommer i dag fra DB-opslag (sikker UUID), men
// guarder mod fremtidige refaktorer der måtte sende user-input direkte hertil.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RawCombination = {
  id: string
  yarn_id_a: string
  yarn_id_b: string
  combined_needle_min_mm: number | null
  combined_needle_max_mm: number | null
  combined_gauge_stitches_10cm: number | null
  combined_thickness_category: string | null
  use_cases: string[] | null
  notes: string | null
}

export async function getCombinationsForYarn(yarnId: string): Promise<YarnCombination[]> {
  if (!UUID_REGEX.test(yarnId)) return []
  const supabase = createSupabasePublicClient()

  const { data: combos, error } = await supabase
    .from('yarn_combinations')
    .select(
      'id, yarn_id_a, yarn_id_b, combined_needle_min_mm, combined_needle_max_mm, combined_gauge_stitches_10cm, combined_thickness_category, use_cases, notes'
    )
    .or(`yarn_id_a.eq.${yarnId},yarn_id_b.eq.${yarnId}`)

  if (error) {
    console.error('getCombinationsForYarn failed:', error.message)
    return []
  }
  const rows = (combos ?? []) as RawCombination[]
  if (rows.length === 0) return []

  const partnerIds = new Set<string>()
  for (const r of rows) {
    partnerIds.add(r.yarn_id_a === yarnId ? r.yarn_id_b : r.yarn_id_a)
  }

  const { data: yarns, error: yErr } = await supabase
    .from('yarns_full')
    .select('id, producer, name, series')
    .in('id', [...partnerIds])

  if (yErr) {
    console.error('getCombinationsForYarn partner-yarns lookup failed:', yErr.message)
    return []
  }

  const yarnMap = new Map<string, YarnPartner>()
  for (const y of (yarns ?? []) as YarnPartner[]) yarnMap.set(y.id, y)

  const out: YarnCombination[] = []
  for (const r of rows) {
    const isSameYarn = r.yarn_id_a === r.yarn_id_b
    const partnerId = r.yarn_id_a === yarnId ? r.yarn_id_b : r.yarn_id_a
    const partner = yarnMap.get(partnerId)
    if (!partner) continue
    out.push({
      id: r.id,
      partner,
      isSameYarn,
      combined_needle_min_mm: r.combined_needle_min_mm,
      combined_needle_max_mm: r.combined_needle_max_mm,
      combined_gauge_stitches_10cm: r.combined_gauge_stitches_10cm,
      combined_thickness_category: r.combined_thickness_category,
      use_cases: r.use_cases ?? [],
      notes: r.notes,
    })
  }
  return out
}
