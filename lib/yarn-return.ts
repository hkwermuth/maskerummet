// Helpers til at returnere garn fra et projekt tilbage til "Mit garn"-lageret.
//
// Bruges af Arkiv.jsx ved (a) sletning af projekt med "Returnér"-valg og
// (b) fjernelse af garn-linje fra et åbent projekt.
//
// Match-strategi (første hit vinder):
//   1. yarn_item_id på linjen (direkte FK)            → matchKind='by-yarn-item-id'
//   2. catalog_color_id (samme katalog-farve, ikke 'Brugt op')
//                                                     → matchKind='by-catalog-color'
//   3. case-insensitive (brand, color_name, color_code) — alle tre kræves
//      ikke-tomme på begge sider                      → matchKind='by-name-color'
//   4. ingen match                                    → null
//
// Race-håndtering: hvis target-row er slettet i mellemtiden, falder vi tilbage
// til INSERT i stedet for at kaste.

import type { SupabaseClient } from '@supabase/supabase-js'

export type ReturnableLine = {
  yarnUsageId: string
  yarnItemId: string | null
  yarnName: string | null
  yarnBrand: string | null
  colorName: string | null
  colorCode: string | null
  hex: string | null
  quantityUsed: number | null
  catalogYarnId: string | null
  catalogColorId: string | null
}

export type MatchKind = 'by-yarn-item-id' | 'by-catalog-color' | 'by-name-color'

export type MatchResult = {
  yarnItemId: string
  currentQuantity: number
  name: string
  brand: string
  colorName: string
  colorCode: string
  hex: string
  status: string
  matchKind: MatchKind
}

export type Decision = 'merge' | 'separate'

export type ReturnSummary = {
  updated: string[]   // yarn_items.id der fik tilført quantity
  created: string[]   // nye yarn_items.id der blev oprettet
}

function nonEmpty(s: string | null | undefined): s is string {
  return typeof s === 'string' && s.trim() !== ''
}

/**
 * Slår op i yarn_items efter en eksisterende række brugeren ejer som matcher
 * den returnable linje. Returnerer null hvis intet match.
 */
export async function findYarnItemMatch(
  supabase: SupabaseClient,
  userId: string,
  line: ReturnableLine,
): Promise<MatchResult | null> {
  // 1) Direkte yarn_item_id-FK
  if (line.yarnItemId) {
    const { data } = await supabase
      .from('yarn_items')
      .select('id, quantity, name, brand, color_name, color_code, hex_color, status')
      .eq('id', line.yarnItemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data) {
      return {
        yarnItemId:    (data as { id: string }).id,
        currentQuantity: Number((data as { quantity: number | null }).quantity ?? 0),
        name:          (data as { name: string | null }).name ?? '',
        brand:         (data as { brand: string | null }).brand ?? '',
        colorName:     (data as { color_name: string | null }).color_name ?? '',
        colorCode:     (data as { color_code: string | null }).color_code ?? '',
        hex:           (data as { hex_color: string | null }).hex_color ?? '',
        status:        (data as { status: string | null }).status ?? 'På lager',
        matchKind:     'by-yarn-item-id',
      }
    }
    // Target er slettet — fortsæt til næste regel.
  }

  // 2) catalog_color_id (springer 'Brugt op' over så vi ikke "genopliver"
  //    et bevidst arkiveret garn med fri-tekst-historik).
  if (line.catalogColorId) {
    const { data } = await supabase
      .from('yarn_items')
      .select('id, quantity, name, brand, color_name, color_code, hex_color, status')
      .eq('catalog_color_id', line.catalogColorId)
      .eq('user_id', userId)
      .neq('status', 'Brugt op')
      .limit(1)
    const row = (data ?? [])[0]
    if (row) {
      return {
        yarnItemId:    (row as { id: string }).id,
        currentQuantity: Number((row as { quantity: number | null }).quantity ?? 0),
        name:          (row as { name: string | null }).name ?? '',
        brand:         (row as { brand: string | null }).brand ?? '',
        colorName:     (row as { color_name: string | null }).color_name ?? '',
        colorCode:     (row as { color_code: string | null }).color_code ?? '',
        hex:           (row as { hex_color: string | null }).hex_color ?? '',
        status:        (row as { status: string | null }).status ?? 'På lager',
        matchKind:     'by-catalog-color',
      }
    }
  }

  // 3) Fallback: case-insensitive match på (brand, color_name, color_code).
  //    Alle tre felter SKAL være ikke-tomme på source-siden — ellers er
  //    falske positiver for sandsynlige.
  if (nonEmpty(line.yarnBrand) && nonEmpty(line.colorName) && nonEmpty(line.colorCode)) {
    const { data } = await supabase
      .from('yarn_items')
      .select('id, quantity, name, brand, color_name, color_code, hex_color, status')
      .eq('user_id', userId)
      .neq('status', 'Brugt op')
      .ilike('brand', line.yarnBrand)
      .ilike('color_name', line.colorName)
      .ilike('color_code', line.colorCode)
      .limit(1)
    const row = (data ?? [])[0]
    if (row) {
      return {
        yarnItemId:    (row as { id: string }).id,
        currentQuantity: Number((row as { quantity: number | null }).quantity ?? 0),
        name:          (row as { name: string | null }).name ?? '',
        brand:         (row as { brand: string | null }).brand ?? '',
        colorName:     (row as { color_name: string | null }).color_name ?? '',
        colorCode:     (row as { color_code: string | null }).color_code ?? '',
        hex:           (row as { hex_color: string | null }).hex_color ?? '',
        status:        (row as { status: string | null }).status ?? 'På lager',
        matchKind:     'by-name-color',
      }
    }
  }

  return null
}

/**
 * Returnerer en eller flere garn-linjer tilbage til lageret.
 *
 * For hver linje:
 *   - decisions.get(yarnUsageId) bestemmer 'merge' eller 'separate'
 *   - hvis decision mangler OG match.matchKind === 'by-yarn-item-id': auto-merge
 *   - hvis decision mangler ellers: behandl som 'separate' (defensiv)
 *
 * Ved merge: yarn_items.quantity += quantityUsed, status sættes til 'På lager',
 *            og brugt_til_projekt + brugt_op_dato nulstilles (så det matcher
 *            virkeligheden: garnet er ikke længere brugt op).
 * Ved separate (eller intet match): opretter ny yarn_items-række.
 *
 * Linjer hvor quantityUsed er null/0/<0 springes over (no-op).
 */
export async function returnYarnLinesToStash(
  supabase: SupabaseClient,
  userId: string,
  lines: ReturnableLine[],
  decisions: Map<string, Decision>,
): Promise<ReturnSummary> {
  const summary: ReturnSummary = { updated: [], created: [] }

  for (const line of lines) {
    const qty = Number(line.quantityUsed ?? 0)
    if (!Number.isFinite(qty) || qty <= 0) continue

    const match = await findYarnItemMatch(supabase, userId, line)
    const explicitDecision = decisions.get(line.yarnUsageId)
    const decision: Decision =
      explicitDecision ??
      (match && match.matchKind === 'by-yarn-item-id' ? 'merge' : 'separate')

    if (match && decision === 'merge') {
      // Inkrementér quantity. Status nulstilles til 'På lager' (vi har lige
      // fået nøgler tilbage), og 'Brugt op'-felter ryddes så historikken
      // matcher den nye virkelighed.
      const newQty = match.currentQuantity + qty
      const { data, error } = await supabase
        .from('yarn_items')
        .update({
          quantity:          newQty,
          status:            'På lager',
          brugt_til_projekt: null,
          brugt_op_dato:     null,
        })
        .eq('id', match.yarnItemId)
        .eq('user_id', userId)
        .select('id')
      if (error) throw error
      if (data && data.length > 0) {
        summary.updated.push(match.yarnItemId)
        continue
      }
      // 0 rækker opdateret → target er slettet i mellemtiden. Fald igennem
      // til INSERT-grenen så brugeren ikke mister sit garn.
    }

    // Insert-grenen (ingen match, decision='separate', eller race ved merge)
    const { data: inserted, error: insErr } = await supabase
      .from('yarn_items')
      .insert([{
        user_id:          userId,
        name:             line.yarnName,
        brand:            line.yarnBrand,
        color_name:       line.colorName,
        color_code:       line.colorCode,
        hex_color:        line.hex,
        quantity:         qty,
        status:           'På lager',
        catalog_yarn_id:  line.catalogYarnId,
        catalog_color_id: line.catalogColorId,
      }])
      .select('id')
      .single()
    if (insErr) throw insErr
    summary.created.push((inserted as { id: string }).id)
  }

  return summary
}
