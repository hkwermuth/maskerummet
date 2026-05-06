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
import { splitYarnItemRow } from './yarn-allocate'

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

// Diskrimineret union så 'behold' kan bære et antal-felt (split mellem lager og
// brugt op). Tidligere streng-form ('brugt-op' | 'behold') konverteres ikke
// — call-sites skal opdateres direkte.
export type FinalizeDecision =
  | { kind: 'brugt-op' }
  | { kind: 'behold'; keepOnStock: number }   // 0 ≤ keepOnStock ≤ quantityUsed

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
 * Anvender brugerens decisions pr. linje. Garanterer at INGEN finalizable
 * yarn_item bevarer status='I brug' for projektet — alt flyttes enten til
 * 'På lager' (behold) eller 'Brugt op' (forbrugt).
 *
 * Decision-paths:
 *   - { kind: 'brugt-op' }                   → alt brugt op
 *   - { kind: 'behold', keepOnStock: 0 }     → alt brugt op (samme som ovenfor)
 *   - { kind: 'behold', keepOnStock: total } → alt tilbage til lager
 *   - { kind: 'behold', keepOnStock: x }     → split: x på lager, (total-x) brugt op
 *   - undefined / mangler                    → default: alt brugt op (defensiv)
 *
 * 'På lager'-rækker oprettet via behold markeres med brugt_til_projekt_id
 * = projektId så revertCascadedYarns kan finde og merge dem tilbage.
 */
export async function finalizeYarnLines(
  supabase:     SupabaseClient,
  userId:       string,
  finalizable:  FinalizableEntry[],
  decisions:    Map<string, FinalizeDecision>,
  projektTitel: string,
  projektId:    string,
  brugtOpDato:  string,
): Promise<{ markedBrugtOp: string[]; keptOnStock: string[] }> {
  const markedBrugtOp: string[] = []
  const keptOnStock:   string[] = []

  // B1 (2026-05-06): Gruppér på yarn_item_id så flere yarn_usage-linjer der
  // peger på samme garn på samme projekt konsolideres til én cascade-split
  // i stedet for at oprette duplikat-rækker (Hannah's Bella Koral-bug).
  type Group = {
    yarnItemId: string
    entries:    FinalizableEntry[]
    totalQty:   number
    totalKeep:  number
    totalUseUp: number
  }
  const groups = new Map<string, Group>()

  for (const entry of finalizable) {
    const yarnItemId = entry.source.yarnItemId
    if (!yarnItemId) continue

    const qty = Number(entry.source.quantityUsed ?? 0)
    if (!Number.isFinite(qty) || qty <= 0) continue

    const decision = decisions.get(entry.source.yarnUsageId)
    // Klamp keepOnStock til [0, qty] for at hedge mod UI-validering der
    // måtte slippe igennem (fx negative tal eller tal > total).
    const keepOnStock = decision?.kind === 'behold'
      ? Math.max(0, Math.min(qty, Math.floor(decision.keepOnStock)))
      : 0
    const useUp = qty - keepOnStock

    let group = groups.get(yarnItemId)
    if (!group) {
      group = { yarnItemId, entries: [], totalQty: 0, totalKeep: 0, totalUseUp: 0 }
      groups.set(yarnItemId, group)
    }
    group.entries.push(entry)
    group.totalQty   += qty
    group.totalKeep  += keepOnStock
    group.totalUseUp += useUp
  }

  for (const group of groups.values()) {
    const { yarnItemId, entries, totalKeep, totalUseUp } = group

    // Step 1: hvis nogen del skal beholdes på lager, split den ud først.
    // Splittet markeres med brugt_til_projekt_id som "tilhørs-marker" så
    // revertCascadedYarns kan finde den (utraditionelt på en På lager-række,
    // men nødvendigt uden ny kolonne — se kommentar dér).
    if (totalKeep > 0) {
      const lagerSplit = await splitYarnItemRow(
        supabase,
        userId,
        yarnItemId,
        totalKeep,
        'På lager',
        {
          brugt_til_projekt:    null,
          brugt_til_projekt_id: projektId,         // marker for revert-merge
          brugt_op_dato:        null,
        },
      )
      keptOnStock.push(lagerSplit.newYarnItemId)
    }

    // Step 2: resten markeres brugt op. Hvis totalUseUp===0 (behold-full), skip.
    // Bug 5 (2026-05-05): rækken bevarer `totalUseUp` som quantity (ikke 0) så
    // Mit Garn kan vise faktisk forbrug pr. projekt. splitYarnItemRow sætter
    // automatisk quantity=totalUseUp på den nye række (eller bevarer
    // source.quantity når totalUseUp===total og source flippes direkte).
    if (totalUseUp > 0) {
      const brugtOpSplit = await splitYarnItemRow(
        supabase,
        userId,
        yarnItemId,
        totalUseUp,
        'Brugt op',
        {
          brugt_til_projekt:    projektTitel || null,
          brugt_til_projekt_id: projektId,
          brugt_op_dato:        brugtOpDato || null,
        },
      )

      // Redirect ALLE yarn_usage-id'er i gruppen til den ene Brugt op-række så
      // revert kan finde dem via SUM(yarn_usage.quantity_used) → restored I
      // brug-quantity.
      if (brugtOpSplit.newYarnItemId !== brugtOpSplit.sourceYarnItemId) {
        for (const entry of entries) {
          const { error: redirErr } = await supabase
            .from('yarn_usage')
            .update({ yarn_item_id: brugtOpSplit.newYarnItemId })
            .eq('id', entry.source.yarnUsageId)
            .eq('user_id', userId)
          if (redirErr) throw redirErr
        }
      }

      markedBrugtOp.push(brugtOpSplit.newYarnItemId)
    }
  }

  return { markedBrugtOp, keptOnStock }
}

// ── revertCascadedYarns ──────────────────────────────────────────────────────

/**
 * Reverter cascade når projekt går tilbage til i_gang/vil_gerne. Silent —
 * ingen modal.
 *
 * Behavior B (brugerens valg, 2026-05-05): MERGE ALT tilbage til 'I brug'.
 * Det inkluderer både:
 *   - 'Brugt op'-rækker (forbrugt-andelen) → status='I brug', quantity bevares
 *     fra rækkens egen `quantity` (Bug 5 datamodel: useUp blev gemt på rækken).
 *     Legacy-rækker hvor quantity=0 (pre-Bug-5 eller pre-backfill) bruger
 *     SUM(yarn_usage.quantity_used) som fallback.
 *   - 'På lager'-rækker oprettet via behold-split (markeret med
 *     brugt_til_projekt_id) → enten merges eller status flyttes tilbage til
 *     'I brug'
 *
 * Match-strategier:
 *   1. brugt_til_projekt_id = projectId (UUID-FK, post-d3f26fe)
 *   2. brugt_til_projekt ILIKE projectTitle hvor _id IS NULL (legacy)
 *
 * For På lager-rækker:
 *   - Hvis der findes en sibling Brugt op→I brug-restoreret række med samme
 *     garn-identitet (catalog_color_id eller brand+color_name+color_code):
 *     SLET På lager-rækken (dens kvantum er allerede med i sibling'ens
 *     bevarede quantity — behold-split-tilfældet).
 *   - Ellers: bare opdater status til 'I brug' og ryd marker (behold-full-
 *     tilfældet).
 */
export async function revertCascadedYarns(
  supabase:     SupabaseClient,
  userId:       string,
  projectId:    string,
  projectTitle: string | null,
): Promise<{ reverted: string[]; mergedFromStock: string[] }> {
  // ── Find Brugt op-rækker: UUID match + legacy title fallback ───────────────
  const { data: byUuid, error: uuidErr } = await supabase
    .from('yarn_items')
    .select('id, quantity, catalog_color_id, brand, color_name, color_code')
    .eq('user_id', userId)
    .eq('status', 'Brugt op')
    .eq('brugt_til_projekt_id', projectId)
  if (uuidErr) throw uuidErr
  const brugtOpRows = (byUuid ?? []) as BrugtOpRow[]

  if (projectTitle && projectTitle.trim() !== '') {
    const { data: byTitle, error: titleErr } = await supabase
      .from('yarn_items')
      .select('id, quantity, catalog_color_id, brand, color_name, color_code')
      .eq('user_id', userId)
      .eq('status', 'Brugt op')
      .is('brugt_til_projekt_id', null)
      .ilike('brugt_til_projekt', projectTitle)
    if (titleErr) throw titleErr
    for (const r of (byTitle ?? []) as BrugtOpRow[]) {
      if (!brugtOpRows.some(b => b.id === r.id)) brugtOpRows.push(r)
    }
  }

  // ── Find På lager-rækker oprettet via behold-split ─────────────────────────
  const { data: paaLagerData, error: lagerErr } = await supabase
    .from('yarn_items')
    .select('id, quantity, catalog_color_id, brand, color_name, color_code')
    .eq('user_id', userId)
    .eq('status', 'På lager')
    .eq('brugt_til_projekt_id', projectId)
  if (lagerErr) throw lagerErr
  const paaLagerRows = (paaLagerData ?? []) as PaaLagerRow[]

  const reverted: string[]        = []
  const mergedFromStock: string[] = []

  // ── Restaurer Brugt op → I brug.
  //
  // Total ngl-restoring afhænger af hvordan finalize blev kørt:
  //   - brugt-op-only (ingen sibling): Brugt op-row har useUp=total → restore
  //     direkte via row.quantity (Bug 5 fast-path).
  //   - behold-split (sibling findes): Brugt op-row har useUp, sibling har
  //     keepOnStock. restoredQty = row.quantity + sibling.quantity (begge
  //     andele samles tilbage på den restorede I brug-række, sibling slettes
  //     bagefter for at undgå duplikat).
  //   - legacy (row.quantity=0, pre-Bug-5 eller pre-backfill): fallback til
  //     SUM(yarn_usage.quantity_used) som dækker hele forbruget.
  for (const row of brugtOpRows) {
    const ownQty = Number(row.quantity ?? 0)
    const sibling = paaLagerRows.find(p => sameYarnIdentity(p, row))
    const siblingQty = sibling ? Number(sibling.quantity ?? 0) : 0

    let restoredQty = ownQty + siblingQty
    if (restoredQty <= 0) {
      const { data: usages, error: uErr } = await supabase
        .from('yarn_usage')
        .select('quantity_used')
        .eq('yarn_item_id', row.id)
        .eq('user_id', userId)
      if (uErr) throw uErr
      restoredQty = (usages ?? [])
        .reduce((sum, u) => sum + Number((u as { quantity_used: number | null }).quantity_used ?? 0), 0)
    }

    const { error: updErr } = await supabase
      .from('yarn_items')
      .update({
        status:               'I brug',
        quantity:             restoredQty,
        brugt_til_projekt:    null,
        brugt_til_projekt_id: null,
        brugt_op_dato:        null,
      })
      .eq('id', row.id)
      .eq('user_id', userId)
    if (updErr) throw updErr
    reverted.push(row.id)
  }

  // ── Håndter På lager-marker-rækker: slet sibling-rækker (behold-split) eller
  //    flyt tilbage til I brug (behold-full) ───────────────────────────────────
  for (const row of paaLagerRows) {
    const sibling = brugtOpRows.find(b => sameYarnIdentity(row, b))
    if (sibling) {
      // behold-split: sibling-row's kvantum er allerede inkluderet i sibling
      // Brugt op-row's restoredQty (sum oven for). Slet duplikatet for at undgå
      // dobbelt-tælling i lageret.
      const { error: delErr } = await supabase
        .from('yarn_items')
        .delete()
        .eq('id', row.id)
        .eq('user_id', userId)
      if (delErr) throw delErr
      mergedFromStock.push(row.id)
    } else {
      // behold-full: rækken er hele projektets allokering. Bare flyt tilbage
      // til 'I brug' og ryd marker.
      const { error: updErr } = await supabase
        .from('yarn_items')
        .update({
          status:               'I brug',
          brugt_til_projekt:    null,
          brugt_til_projekt_id: null,
          brugt_op_dato:        null,
        })
        .eq('id', row.id)
        .eq('user_id', userId)
      if (updErr) throw updErr
      reverted.push(row.id)
    }
  }

  return { reverted, mergedFromStock }
}

// ── Identity-match helper ────────────────────────────────────────────────────

export type IdentityRow = {
  id:                string
  catalog_color_id:  string | null
  brand:             string | null
  color_name:        string | null
  color_code:        string | null
}

type BrugtOpRow = IdentityRow & {
  quantity: number | null
}

type PaaLagerRow = IdentityRow & {
  quantity: number | null
}

export function sameYarnIdentity(a: IdentityRow, b: IdentityRow): boolean {
  const lower = (s: string | null) => (s ?? '').trim().toLowerCase()
  const aHasText = !!(lower(a.brand) && lower(a.color_name) && lower(a.color_code))
  const bHasText = !!(lower(b.brand) && lower(b.color_name) && lower(b.color_code))

  // Tekst-identitet vinder: to rækker med samme brand+color_name+color_code er
  // samme garn, uanset om kun én af dem også er katalog-koblet (Hannah's
  // Råhvid 883150-bug 2026-05-06: én række havde catalog_color_id, en anden
  // ikke, men begge var samme garn — de skulle merges).
  if (aHasText && bHasText) {
    return (
      lower(a.brand) === lower(b.brand) &&
      lower(a.color_name) === lower(b.color_name) &&
      lower(a.color_code) === lower(b.color_code)
    )
  }

  // Fallback til katalog-uuid kun når mindst én side mangler tekst-felter.
  if (a.catalog_color_id && b.catalog_color_id) {
    return a.catalog_color_id === b.catalog_color_id
  }

  return false
}
