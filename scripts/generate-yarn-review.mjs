#!/usr/bin/env node
/**
 * Genererer content/yarns_review.xlsx — et review-ark hvor brugeren
 * bekræfter den primære pind + masker + omgange pr. garn.
 *
 * Brug:
 *   npm run review:export
 *
 * Output: content/yarns_review.xlsx med ét ark "yarns_review".
 * Rækker med flags (datakvalitetsproblemer) sorteres øverst.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'
import {
  REVIEW_COLUMNS,
  REVIEW_SHEET_NAME,
  yarnRowToReviewCells,
} from './_review-xlsx.mjs'

const root = loadEnv()
const supabase = makeAdminClient()

async function run() {
  const { data, error } = await supabase
    .from('yarns')
    .select('id, producer, name, series, full_name, needle_min_mm, needle_max_mm, gauge_stitches_10cm, gauge_rows_10cm, gauge_needle_mm')
    .order('producer', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Fejl ved hentning af yarns:', error.message)
    process.exit(1)
  }

  const yarns = data ?? []
  console.log(`Hentet ${yarns.length} garner`)

  const rows = yarns.map(yarnRowToReviewCells)

  // Sortér: rækker med flags øverst, derefter alfabetisk
  rows.sort((a, b) => {
    const aHas = a.bør_kigges_på ? 1 : 0
    const bHas = b.bør_kigges_på ? 1 : 0
    if (aHas !== bHas) return bHas - aHas
    const pCmp = String(a.producer).localeCompare(String(b.producer), 'da')
    if (pCmp !== 0) return pCmp
    return String(a.name).localeCompare(String(b.name), 'da')
  })

  const ws = XLSX.utils.json_to_sheet(rows, { header: REVIEW_COLUMNS })

  // Sæt fornuftige kolonnebredder
  ws['!cols'] = REVIEW_COLUMNS.map((col) => {
    if (col === 'id') return { wch: 38 }
    if (col === 'full_name' || col === 'name') return { wch: 28 }
    if (col === 'producer') return { wch: 18 }
    if (col === 'bør_kigges_på') return { wch: 32 }
    if (col === 'noter') return { wch: 30 }
    if (col.startsWith('bekræftet_')) return { wch: 18 }
    return { wch: 14 }
  })

  // Forklaringsark
  const explain = XLSX.utils.aoa_to_sheet([
    ['STRIQ — Garn-review'],
    [''],
    ['Sådan bruger du arket:'],
    ['1. Kolonnerne "bekræftet_primær_pind", "bekræftet_gauge_st", "bekræftet_gauge_omg" er DEM du skal udfylde.'],
    ['2. Alle tre skal udfyldes for at en række importeres tilbage. Delvist udfyldte rækker springes over.'],
    ['3. Når du er færdig: kør "npm run review:import" (eller "review:import:dry" for at se hvad der ville ske).'],
    [''],
    ['Flag-typer i kolonnen "bør_kigges_på":'],
    ['  mangler_pind            — gauge_needle_mm er ikke udfyldt OG producent har ikke angivet entydig pind (needle_min ≠ needle_max)'],
    ['  mangler_omg             — gauge_rows_10cm er ikke udfyldt'],
    ['  mangler_gauge           — gauge_stitches_10cm er ikke udfyldt'],
    ['  pind_uden_for_interval  — gauge_needle_mm ligger uden for needle_min/max'],
    ['  ekstrem_gauge           — gauge_stitches_10cm > 40 eller < 8 (sandsynlig tastefejl)'],
    ['  bred_pind               — needle_max - needle_min ≥ 1,5 mm (heuristik er bare et gæt — du bør vælge aktivt)'],
    [''],
    ['Forslagskolonnen "foreslået_primær_pind":'],
    ['  Bruger producentens angivne gauge_needle_mm hvis sat. Ellers midt af pind-intervallet rundet til nærmeste 0,5 mm.'],
    ['  Du kan acceptere forslaget ved at kopiere det over til "bekræftet_primær_pind", eller skrive et andet tal.'],
  ])
  explain['!cols'] = [{ wch: 120 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, REVIEW_SHEET_NAME)
  XLSX.utils.book_append_sheet(wb, explain, 'Forklaring')

  const outPath = resolve(root, 'content/yarns_review.xlsx')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(outPath, buf)

  const flagged = rows.filter((r) => r.bør_kigges_på).length
  console.log(`Skrev ${outPath}`)
  console.log(`  ${rows.length} garner total`)
  console.log(`  ${flagged} med flag (sorteret øverst)`)
  console.log(`  ${rows.length - flagged} uden flag`)
}

run().catch((e) => { console.error(e); process.exit(1) })
