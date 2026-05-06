// Konsolidering af duplikat-yarn_items.
//
// Bruges når en garn-flow operation (retur til lager) potentielt har skabt
// eller opdaget duplikat-rækker for samme garn-identitet inden for samme
// status. Slår dem sammen til én række så Mit Garn ikke viser fx tre
// separate "Bella Koral"-kort der reelt repræsenterer samme stash-position.
//
// Strategi:
//   1. Find alle yarn_items med samme user_id + status + identitet (matcher
//      sameYarnIdentity fra yarn-finalize) som target-rækken.
//   2. Hvis kun target findes (ingen duplikater): no-op.
//   3. Ellers: redirect yarn_usage.yarn_item_id fra duplikater → target,
//      summer duplikat-quantity ind i target, backfill NULL-metadata på
//      target fra første duplikat med non-NULL, slet duplikater.
//
// Atomicitet (v1): multi-step uden transaktion. Rækkefølge minimerer skade
// hvis del-fejl: redirect usage → update target → delete duplicates. Hvis
// sidste del fejler er invarianten stadig OK (target har korrekt sum, usage
// peger på target, taberne er adskilte men "døde"). Senere: pak i RPC.
//
// Race-håndtering: vi læser duplikat-listen og sammenfletter. Hvis to
// samtidige sessioner konsoliderer samme garn, vil den anden caller bare
// finde færre rækker og no-op'e (eller dobbelt-tælle hvis der er race
// imellem read og update — accepteret v1-niveau).

import type { SupabaseClient } from '@supabase/supabase-js'
import { sameYarnIdentity, type IdentityRow } from './yarn-finalize'

export type ConsolidateResult = {
  mergedInto:  string     // target yarn_items.id (uændret hvis ingen duplikater)
  deletedIds:  string[]   // ids på de duplikater der blev slettet
  totalQty:    number     // ny quantity på target efter merge (også ved no-op)
}

// Felter der overføres fra duplikat til target hvis target har NULL men
// duplikat har værdi. Bevarer target's eksisterende non-NULL værdier.
const METADATA_FIELDS = [
  'image_url',
  'fiber',
  'yarn_weight',
  'hex_color',
  'hex_colors',
  'gauge',
  'meters',
  'notes',
  'color_category',
  'catalog_image_url',
] as const

type DuplicateRow = IdentityRow & {
  quantity:          number | null
  status:            string | null
  brugt_til_projekt_id: string | null
  // Metadata-felter til backfill (Record giver vi os selv lov til så listen
  // af felter kan udvides uden at TypeScript brokker sig).
} & Record<string, unknown>

/**
 * Konsolidér På lager-duplikater for target-rækken.
 *
 * Finder alle yarn_items med:
 *   - samme user_id
 *   - status = 'På lager'
 *   - samme garn-identitet (catalog_color_id ELLER brand+color_name+color_code,
 *     alle ikke-tomme)
 *   - id ≠ targetId
 *
 * Hvis fundet: redirect yarn_usage, sum quantity ind i target, backfill
 * NULL-metadata, slet duplikater.
 *
 * No-op hvis target ikke findes eller har anden status end 'På lager'.
 */
export async function consolidateOnStockDuplicates(
  supabase: SupabaseClient,
  userId:   string,
  targetId: string,
): Promise<ConsolidateResult> {
  // Læs target med fuld identitet + metadata. brugt_til_projekt_id med så vi
  // kan begrænse kandidat-søgningen til rækker med samme marker (eller begge
  // null) — matcher migration-partition-logikken.
  const { data: targetData, error: targetErr } = await supabase
    .from('yarn_items')
    .select('id, status, quantity, catalog_color_id, brand, color_name, color_code, image_url, fiber, yarn_weight, hex_color, hex_colors, gauge, meters, notes, color_category, catalog_image_url, brugt_til_projekt_id')
    .eq('id', targetId)
    .eq('user_id', userId)
    .maybeSingle()
  if (targetErr) throw targetErr
  if (!targetData) {
    return { mergedInto: targetId, deletedIds: [], totalQty: 0 }
  }
  const target = targetData as DuplicateRow
  if (target.status !== 'På lager') {
    return { mergedInto: targetId, deletedIds: [], totalQty: Number(target.quantity ?? 0) }
  }

  // Find kandidat-duplikater: samme user, samme status, samme
  // brugt_til_projekt_id (eller begge null), IKKE target selv. Match-på-marker
  // er vigtigt så vi IKKE konsoliderer en plain 'På lager'-række med en
  // behold-split-marker — markeren skal overleve indtil revertCascadedYarns
  // flytter den tilbage til 'I brug' (matcher migration-logikken i
  // 20260506000001 hvor PARTITION inkluderer brugt_til_projekt_id).
  let candidatesQuery = supabase
    .from('yarn_items')
    .select('id, status, quantity, catalog_color_id, brand, color_name, color_code, image_url, fiber, yarn_weight, hex_color, hex_colors, gauge, meters, notes, color_category, catalog_image_url, brugt_til_projekt_id')
    .eq('user_id', userId)
    .eq('status', 'På lager')
    .neq('id', targetId)
  candidatesQuery = target.brugt_til_projekt_id
    ? candidatesQuery.eq('brugt_til_projekt_id', target.brugt_til_projekt_id)
    : candidatesQuery.is('brugt_til_projekt_id', null)
  const { data: candidates, error: candErr } = await candidatesQuery
  if (candErr) throw candErr

  const duplicates = (candidates ?? []).filter(c => sameYarnIdentity(c as IdentityRow, target)) as DuplicateRow[]
  if (duplicates.length === 0) {
    return { mergedInto: targetId, deletedIds: [], totalQty: Number(target.quantity ?? 0) }
  }

  // Step 1: redirect yarn_usage fra duplikater til target.
  const duplicateIds = duplicates.map(d => d.id)
  const { error: redirErr } = await supabase
    .from('yarn_usage')
    .update({ yarn_item_id: targetId })
    .in('yarn_item_id', duplicateIds)
    .eq('user_id', userId)
  if (redirErr) throw redirErr

  // Step 2: backfill NULL-metadata på target fra første duplikat med værdi.
  const backfill: Record<string, unknown> = {}
  for (const field of METADATA_FIELDS) {
    if (target[field] !== null && target[field] !== undefined && target[field] !== '') continue
    for (const dup of duplicates) {
      const value = dup[field]
      if (value !== null && value !== undefined && value !== '') {
        backfill[field] = value
        break
      }
    }
  }

  // Step 3: opdater target med summeret quantity + backfill.
  const targetQty = Number(target.quantity ?? 0)
  const dupSum    = duplicates.reduce((sum, d) => sum + Number(d.quantity ?? 0), 0)
  const newQty    = targetQty + dupSum

  const { error: updErr } = await supabase
    .from('yarn_items')
    .update({ quantity: newQty, ...backfill })
    .eq('id', targetId)
    .eq('user_id', userId)
  if (updErr) throw updErr

  // Step 4: slet duplikater. yarn_usage peger nu på target så ingen orphans.
  const { error: delErr } = await supabase
    .from('yarn_items')
    .delete()
    .in('id', duplicateIds)
    .eq('user_id', userId)
  if (delErr) throw delErr

  return {
    mergedInto: targetId,
    deletedIds: duplicateIds,
    totalQty:   newQty,
  }
}
