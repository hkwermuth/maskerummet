#!/usr/bin/env node
// One-off: ret "lin" → "hør" i content/yarns.xlsx for de 3 garner der ikke har fået
// fulgt med ALTER TYPE i migration 20260502000001_rename_fiber_lin_to_hoer.sql.
// Påvirker: CaMaRose Løvetand, Sandnes Line, Vendita GmbH Korsika.
// Kør:
//   node scripts/fix-lin-til-hoer.mjs
//   npm run import:yarns

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const here = dirname(fileURLToPath(import.meta.url))
const xlsxPath = resolve(here, '..', 'content', 'yarns.xlsx')

const buf = readFileSync(xlsxPath)
const wb = XLSX.read(buf, { type: 'buffer' })
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { defval: '' })

let changed = 0
for (const r of rows) {
  let touched = false

  // 1) fibers JSON: "lin" → "hør"
  if (typeof r.fibers === 'string' && /"fiber"\s*:\s*"lin"/.test(r.fibers)) {
    const before = r.fibers
    r.fibers = r.fibers.replace(/"fiber"\s*:\s*"lin"/g, '"fiber":"hør"')
    if (before !== r.fibers) touched = true
  }

  // 2) fiber_main: "lin" som token (ikke en del af "lin..." som "Linnen") → "hør"
  if (typeof r.fiber_main === 'string' && /\blin\b/i.test(r.fiber_main)) {
    const before = r.fiber_main
    r.fiber_main = r.fiber_main.replace(/\blin\b/gi, 'hør')
    if (before !== r.fiber_main) touched = true
  }

  if (touched) {
    console.log(`✓ ${r.producer} / ${r.name}  → fibers=${r.fibers}, fiber_main=${r.fiber_main}`)
    changed++
  }
}

if (changed === 0) {
  console.log('Ingen ændringer nødvendige.')
} else {
  const headers = Object.keys(rows[0])
  const newSheet = XLSX.utils.json_to_sheet(rows, { header: headers })
  wb.Sheets['Sheet1'] = newSheet
  writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  console.log(`\n${changed} garner opdateret. Skrevet til ${xlsxPath}`)
  console.log('Næste skridt: npm run import:yarns')
}
