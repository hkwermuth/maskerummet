// Auto-cascade brugt-op + de-cascade ved projekt-status-skift.
//
// Bruges af Arkiv.jsx ved (a) DetailModal status-skift til faerdigstrikket
// (cascade I brug → Brugt op via modal-bekræftelse), (b) DetailModal status-
// skift væk fra faerdigstrikket (silent revert), og (c) NytProjektModal
// første-gangs-oprettelse med faerdigstrikket-status.
//
// Modsætning til lib/yarn-allocate.ts og lib/yarn-return.ts:
//   yarn-allocate.ts:  lager → projekt (forbrug ved tilføjelse)
//   yarn-return.ts:    projekt → lager (tilbageførsel ved fjernelse)
//   yarn-finalize.ts:  status-skift på lager-rækker når projekt går ind/ud
//                      af faerdigstrikket-status
//
// Match-prioritet ved de-cascade:
//   1. brugt_til_projekt_id = projektId (UUID-FK, robust)
//   2. fallback: brugt_til_projekt = projektTitle (legacy-rækker fra før
//      migration 20260504000001 hvor _id-kolonnen ikke fandtes)

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Typer ─────────────────────────────────────────────────────────────────────

export type FinalizableSource = {
  yarnUsageId:  string
  yarnItemId:   string | null
  yarnName:     string | null
  yarnBrand:    string | null
  colorName:    string | null
  colorCode:    string | null
  hex:          string | null
  quantityUsed: number | null
}

export type FinalizableEntry = {
  source:               FinalizableSource
  currentStockQuantity: number
  currentStatus:        string
}

export type MultiProjectEntry = {
  source:             FinalizableSource
  otherProjectTitles: string[]
}

export type FinalizableClassification = {
  finalizable:    FinalizableEntry[]
  multiProject:   MultiProjectEntry[]
  noYarnItem:     FinalizableSource[]
  alreadyBrugtOp: FinalizableSource[]
}

export type FinalizeDecision = 'brugt-op' | 'behold'

const ACTIVE_PROJECT_STATUSES = ['i_gang', 'vil_gerne']

// ── classifyFinalizableLines ─────────────────────────────────────────────────

/**
 * Klassificerer projekt-linjer ved cascade-trigger. Resultat-buckets:
 *
 *   - finalizable:    har yarn_item_id og kan cascades. Vis i modal med radio.
 *   - multiProject:   yarn_item bruges af andre AKTIVE projekter. Kan ikke
 *                     cascades; vis projekt-titler så brugeren kan reagere.
 *   - noYarnItem:     ingen yarn_item_id-link (manuel/katalog-only linje).
 *                     Vis info-banner.
 *   - alreadyBrugtOp: yarn_item er allerede status='Brugt op'. Skip silently
 *                     (idempotent re-cascade).
 */
export async function classifyFinalizableLines(
  supabase:         SupabaseClient,
  userId:           string,
  currentProjectId: string,
  lines:            FinalizableSource[],
): Promise<FinalizableClassification> {
  const result: FinalizableClassification = {
    finalizable:    [],
    multiProject:   [],
    noYarnItem:     [],
    alreadyBrugtOp: [],
  }

  for (const line of lines) {
    if (!line.yarnItemId) {
      result.noYarnItem.push(line)
      continue
    }

    const { data: yarn, error: yErr } = await supabase
      .from('yarn_items')
      .select('id, status, quantity')
      .eq('id', line.yarnItemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (yErr) throw yErr
    if (!yarn) {
      // Slettet i mellemtiden → behandl som no-yarn-item
      result.noYarnItem.push(line)
      continue
    }

    const yarnRow = yarn as { id: string; status: string | null; quantity: number | null }
    const status  = yarnRow.status ?? ''

    if (status === 'Brugt op') {
      result.alreadyBrugtOp.push(line)
      continue
    }

    // Tjek om yarn_item bruges af andre aktive projekter (i_gang/vil_gerne).
    // RLS dækker user_id, men eksplicit guard via projects.user_id matcher
    // intent og dokumenterer det for fremtidige læsere.
    const { data: otherUsages, error: uErr } = await supabase
      .from('yarn_usage')
      .select('project_id, projects!inner(id, title, status, user_id)')
      .eq('yarn_item_id', line.yarnItemId)
      .neq('project_id', currentProjectId)
      .eq('projects.user_id', userId)
      .in('projects.status', ACTIVE_PROJECT_STATUSES)
    if (uErr) throw uErr

    if (otherUsages && otherUsages.length > 0) {
      const titles = otherUsages
        .map(u => {
          // Supabase nested-relation: kan returneres som array eller objekt
          // afhængigt af relation-cardinality. Vi accepterer begge.
          const proj = (u as { projects: unknown }).projects
          if (Array.isArray(proj)) return (proj[0] as { title?: string } | undefined)?.title ?? null
          return (proj as { title?: string } | null)?.title ?? null
        })
        .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
      result.multiProject.push({
        source:             line,
        otherProjectTitles: Array.from(new Set(titles)),
      })
      continue
    }

    result.finalizable.push({
      source:               line,
      currentStockQuantity: Number(yarnRow.quantity ?? 0),
      currentStatus:        status,
    })
  }

  return result
}

// ── finalizeYarnLines ────────────────────────────────────────────────────────

/**
 * Markerer valgte garn som 'Brugt op'. Kun linjer hvor decisions[yarnUsageId]
 * === 'brugt-op' røres — 'behold' (default) skipper.
 *
 * Sætter status='Brugt op', quantity=0, brugt_til_projekt + _id, brugt_op_dato.
 * Bruger UUID-FK i stedet for kun title så de-cascade kan finde rækken igen
 * uden title-fragility.
 */
export async function finalizeYarnLines(
  supabase:     SupabaseClient,
  userId:       string,
  finalizable:  FinalizableEntry[],
  decisions:    Map<string, FinalizeDecision>,
  projektTitel: string,
  projektId:    string,
  brugtOpDato:  string,
): Promise<{ markedBrugtOp: string[] }> {
  const markedBrugtOp: string[] = []

  for (const entry of finalizable) {
    const decision = decisions.get(entry.source.yarnUsageId) ?? 'behold'
    if (decision !== 'brugt-op') continue
    const yarnItemId = entry.source.yarnItemId
    if (!yarnItemId) continue

    // user_id-filter dublerer RLS men giver eksplicit defense-in-depth +
    // matcher mønstret i revertCascadedYarns (linje 263).
    const { error } = await supabase
      .from('yarn_items')
      .update({
        status:               'Brugt op',
        quantity:             0,
        brugt_til_projekt:    projektTitel || null,
        brugt_til_projekt_id: projektId,
        brugt_op_dato:        brugtOpDato || null,
      })
      .eq('id', yarnItemId)
      .eq('user_id', userId)
    if (error) throw error
    markedBrugtOp.push(yarnItemId)
  }

  return { markedBrugtOp }
}

// ── revertCascadedYarns ──────────────────────────────────────────────────────

/**
 * Reverter cascadede 'Brugt op'-rækker tilbage til 'I brug' når projekt går
 * tilbage til i_gang/vil_gerne. Silent — ingen modal.
 *
 * Match-strategi (begge køres, resultatet de-dupeses):
 *   1. brugt_til_projekt_id = projectId (UUID-FK, post-d3f26fe data)
 *   2. brugt_til_projekt ILIKE projectTitle hvor _id IS NULL (legacy)
 *
 * Quantity restaureres til SUM(yarn_usage.quantity_used) for samme yarn_item_id
 * — det matcher hvad der oprindeligt var allokeret før cascade-quantity=0.
 * Hvis ingen yarn_usage findes (sjælden race), sætter vi quantity=0 (defensiv).
 *
 * brugt_til_projekt, _id og brugt_op_dato ryddes så historikken matcher den
 * nye virkelighed (garnet er ikke længere brugt op).
 */
export async function revertCascadedYarns(
  supabase:     SupabaseClient,
  userId:       string,
  projectId:    string,
  projectTitle: string | null,
): Promise<{ reverted: string[] }> {
  // Primary: UUID match
  const { data: byUuid, error: uuidErr } = await supabase
    .from('yarn_items')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'Brugt op')
    .eq('brugt_til_projekt_id', projectId)
  if (uuidErr) throw uuidErr
  const uuidIds = (byUuid ?? []).map(r => (r as { id: string }).id)

  // Fallback: title match for legacy-rækker uden brugt_til_projekt_id
  let titleIds: string[] = []
  if (projectTitle && projectTitle.trim() !== '') {
    const { data: byTitle, error: titleErr } = await supabase
      .from('yarn_items')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'Brugt op')
      .is('brugt_til_projekt_id', null)
      .ilike('brugt_til_projekt', projectTitle)
    if (titleErr) throw titleErr
    titleIds = (byTitle ?? []).map(r => (r as { id: string }).id)
  }

  const allIds = Array.from(new Set([...uuidIds, ...titleIds]))
  const reverted: string[] = []

  for (const yarnItemId of allIds) {
    // Restaurer quantity som sum af yarn_usage for samme yarn_item.
    // (Brugerens v1-forventning: 5 ngl I brug → 5 ngl Brugt op → revert →
    // 5 ngl I brug igen — ikke 0.)
    const { data: usages, error: uErr } = await supabase
      .from('yarn_usage')
      .select('quantity_used')
      .eq('yarn_item_id', yarnItemId)
    if (uErr) throw uErr
    const restoredQty = (usages ?? [])
      .reduce((sum, u) => sum + Number((u as { quantity_used: number | null }).quantity_used ?? 0), 0)

    const { error: updErr } = await supabase
      .from('yarn_items')
      .update({
        status:               'I brug',
        quantity:             restoredQty,
        brugt_til_projekt:    null,
        brugt_til_projekt_id: null,
        brugt_op_dato:        null,
      })
      .eq('id', yarnItemId)
      .eq('user_id', userId)
    if (updErr) throw updErr
    reverted.push(yarnItemId)
  }

  return { reverted }
}
