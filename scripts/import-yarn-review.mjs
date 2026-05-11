#!/usr/bin/env node
/**
 * Importerer bekræftede pind+gauge-data fra content/yarns_review.xlsx tilbage
 * til yarns-tabellen. Overskriver KUN gauge_needle_mm, gauge_stitches_10cm,
 * gauge_rows_10cm — alle andre felter forbliver urørte.
 *
 * Brug:
 *   npm run review:import         # kør import
 *   npm run review:import:dry     # vis hvad der ville ske, uden at skrive
 *
 * Rækker uden alle tre bekræftet-felter springes over og logges i
 * content/yarns_review_report.csv.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'
import { REVIEW_SHEET_NAME, parseReviewRow } from './_review-xlsx.mjs'

const root = loadEnv()
const supabase = makeAdminClient()
const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run')

function csvEscape(s) {
  const str = s == null ? '' : String(s)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

async function run() {
  const xlsxPath = resolve(root, 'content/yarns_review.xlsx')
  let buf
  try { buf = readFileSync(xlsxPath) }
  catch {
    console.error(`Kan ikke læse ${xlsxPath}. Kør 'npm run review:export' først.`)
    process.exit(1)
  }

  const wb = XLSX.read(buf, { type: 'buffer' })
  if (!wb.SheetNames.includes(REVIEW_SHEET_NAME)) {
    console.error(`Mangler ark "${REVIEW_SHEET_NAME}" i workbook. Fundne ark: ${wb.SheetNames.join(', ')}`)
    process.exit(1)
  }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[REVIEW_SHEET_NAME], { defval: '' })
  console.log(`Læst ${rows.length} rækker fra ${xlsxPath}`)
  if (DRY) console.log('** DRY RUN — ingen ændringer skrives **\n')

  let opdateret = 0, sprunget = 0, partial_count = 0, ugyldig = 0, fejl = 0, slettet = 0
  const reportLines = ['id,producer,name,status,reason']

  for (const row of rows) {
    const label = `${row.producer ?? ''} / ${row.name ?? ''}${row.series ? ' / ' + row.series : ''}`

    // Søstrene Grene Mohair Blend skal slettes (ekstrem_gauge-flag, ingen kender det rigtige tal)
    if (String(row.producer).toLowerCase().includes('søstrene') && String(row.name).toLowerCase().includes('mohair blend')) {
      try {
        if (!DRY) {
          // Slet relaterede fibre først (yarn_fiber_components.yarn_id har normalt CASCADE,
          // men vi er eksplicitte for at undgå overraskelser)
          await supabase.from('yarn_fiber_components').delete().eq('yarn_id', row.id)
          const { error } = await supabase.from('yarns').delete().eq('id', row.id)
          if (error) throw error
        }
        slettet++
        console.log(`✗ ${label}  [SLETTET]`)
        reportLines.push([row.id, row.producer, row.name, 'slettet', 'ekstrem_gauge: brugeren markerede til sletning'].map(csvEscape).join(','))
      } catch (e) {
        fejl++
        console.error(`✗ ${label}: ${e.message}`)
        reportLines.push([row.id, row.producer, row.name, 'fejl_slet', e.message].map(csvEscape).join(','))
      }
      continue
    }

    const { id, payload, status, reason } = parseReviewRow(row)

    if (status === 'tom') {
      sprunget++
      reportLines.push([id, row.producer, row.name, status, reason].map(csvEscape).join(','))
      continue
    }
    if (status === 'ugyldig') {
      ugyldig++
      console.error(`✗ ${label}: ${reason}`)
      reportLines.push([id, row.producer, row.name, status, reason].map(csvEscape).join(','))
      continue
    }

    try {
      if (!DRY) {
        const { error } = await supabase.from('yarns').update(payload).eq('id', id)
        if (error) throw error
      }
      if (status === 'partial') partial_count++
      else opdateret++
      const summary = [
        payload.gauge_needle_mm != null ? `pind ${payload.gauge_needle_mm}` : '',
        payload.gauge_stitches_10cm != null ? `${payload.gauge_stitches_10cm}m` : '',
        payload.gauge_rows_10cm != null ? `${payload.gauge_rows_10cm}p` : '',
      ].filter(Boolean).join(' / ')
      console.log(`✓ ${label}  [${summary}${status === 'partial' ? ' — delvis' : ''}]`)
      reportLines.push([id, row.producer, row.name, status === 'partial' ? 'delvis_opdateret' : 'opdateret', reason].map(csvEscape).join(','))
    } catch (e) {
      fejl++
      console.error(`✗ ${label}: ${e.message}`)
      reportLines.push([id, row.producer, row.name, 'fejl', e.message].map(csvEscape).join(','))
    }
  }

  // Skriv rapport
  const reportPath = resolve(root, 'content/yarns_review_report.csv')
  writeFileSync(reportPath, reportLines.join('\n') + '\n', 'utf8')

  console.log(`\nResultat:`)
  console.log(`  Opdateret (komplet):     ${opdateret}`)
  console.log(`  Opdateret (delvis):      ${partial_count}`)
  console.log(`  Slettet:                 ${slettet}`)
  console.log(`  Sprunget over (tomme):   ${sprunget}`)
  console.log(`  Ugyldige:                ${ugyldig}`)
  console.log(`  Fejl:                    ${fejl}`)
  console.log(`Rapport skrevet til ${reportPath}`)

  // Revalidate kun hvis vi faktisk opdaterede noget
  const site = process.env.NEXT_PUBLIC_SITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!DRY && (opdateret + partial_count + slettet) > 0 && site && secret) {
    try {
      const res = await fetch(
        `${site}/api/revalidate?secret=${secret}&path=/garn`,
        { method: 'POST' }
      )
      console.log(`Revalidate: ${res.status}`)
    } catch (e) {
      console.warn('Revalidate fejlede:', e.message)
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
