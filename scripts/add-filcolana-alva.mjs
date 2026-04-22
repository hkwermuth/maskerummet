#!/usr/bin/env node
// One-off: tilføj Filcolana Alva til yarns.xlsx og sæt hero_image_url på Tilia.
// Data hentet fra filcolana.dk/yarns/alva.html 2026-04-22.
// Kør: node scripts/add-filcolana-alva.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const here = dirname(fileURLToPath(import.meta.url))
const xlsxPath = resolve(here, '..', 'content', 'yarns.xlsx')

const buf = readFileSync(xlsxPath)
const wb = XLSX.read(buf, { type: 'buffer' })

const sheetName = 'Sheet1'
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' })

const ALVA_IMG = '/garn-eksempler/filcolana-alva.jpg'
const TILIA_IMG = '/garn-eksempler/filcolana-tilia.jpg'

const alvaRow = {
  id: '',
  producer: 'Filcolana',
  name: 'Alva',
  series: '',
  fiber_main: 'alpaka',
  thickness_category: 'lace',
  ball_weight_g: 25,
  length_per_100g_m: 700,
  needle_min_mm: '',
  needle_max_mm: '',
  gauge_stitches_10cm: '',
  gauge_rows_10cm: '',
  gauge_needle_mm: '',
  twist_structure: 'tyndt 2-trådet alpakagarn',
  ply_count: 2,
  spin_type: 'plied',
  finish: '',
  wash_care: 'handvask',
  origin_country: 'Peru',
  fiber_origin_country: 'Peru',
  status: 'i_produktion',
  certifications: '[]',
  seasonal_suitability: '[]',
  use_cases: '["følgegarn","sjaler","lette bluser"]',
  description:
    'Alva er et tyndt 2-trådet garn spundet af fibre fra peruvianske alpakaer. Alva er blød, varm og glansfuld og velegnet til mange slags projekter. Det tynde garn er perfekt til at strikke sammen med vores andre kvaliteter. Desuden er Alva et herligt alternativt følgegarn i stedet for et tyndt mohairgarn.',
  hero_image_url: ALVA_IMG,
  fibers: '[{"fiber":"alpaka","percentage":100}]',
}

// Tjek for eksisterende Alva — opdater hvis findes, ellers indsæt
const existingAlvaIdx = rows.findIndex(
  (r) => String(r.producer).toLowerCase() === 'filcolana'
    && String(r.name).toLowerCase() === 'alva'
)
if (existingAlvaIdx >= 0) {
  rows[existingAlvaIdx].hero_image_url = ALVA_IMG
  console.log(`✓ Alva fandtes — opdateret hero_image_url til ${ALVA_IMG}`)
} else {
  rows.push(alvaRow)
  console.log('✓ Tilføjet: Filcolana Alva')
}

// Opdater Tilia med hero_image_url
const tiliaIdx = rows.findIndex(
  (r) => String(r.producer).toLowerCase() === 'filcolana'
    && String(r.name).toLowerCase() === 'tilia'
)
if (tiliaIdx >= 0) {
  rows[tiliaIdx].hero_image_url = TILIA_IMG
  console.log(`✓ Tilia — hero_image_url sat til ${TILIA_IMG}`)
} else {
  console.warn('⚠  Kunne ikke finde Tilia — spring over')
}

// Skriv tilbage med samme kolonne-rækkefølge
const headers = Object.keys(rows[0])
const newSheet = XLSX.utils.json_to_sheet(rows, { header: headers })
wb.Sheets[sheetName] = newSheet

writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log(`\nSkrevet til ${xlsxPath}`)
console.log(`Kør nu: npm run import:yarns`)
