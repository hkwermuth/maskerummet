#!/usr/bin/env node
// Runde 2: kopierer 6 billeder fra garn-billeder-staging/ til public/garn-eksempler/,
// opdaterer 5 eksisterende garner med hero_image_url, og tilføjer 1 nyt garn (Katia Linen).
// Specs hentet fra producent-sider 2026-05-06.
// Kør:
//   node scripts/add-staging-billeder-2.mjs
//   npm run import:yarns

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const staging = resolve(root, 'garn-billeder-staging')
const publicDir = resolve(root, 'public', 'garn-eksempler')
const xlsxPath = resolve(root, 'content', 'yarns.xlsx')

const IMAGE_COPIES = [
  { src: 'IMG_6117.JPEG', dst: 'katia-linen.jpg' },
  { src: 'IMG_6119.JPEG', dst: 'edy-angola-alpaca-merino.jpg' },
  { src: 'IMG_6120.JPEG', dst: 'istex-lettlopi.jpg' },
  { src: 'IMG_6122.JPEG', dst: 'mayflower-nordia.jpg' },
  { src: 'IMG_6123.JPEG', dst: 'istex-einband.jpg' },
  { src: 'IMG_6124.JPEG', dst: 'istex-plotulopi.jpg' },
]

console.log('— Kopierer billeder —')
for (const { src, dst } of IMAGE_COPIES) {
  const s = resolve(staging, src)
  const d = resolve(publicDir, dst)
  if (!existsSync(s)) {
    console.warn(`  ⚠  Mangler: ${src} — springer over`)
    continue
  }
  copyFileSync(s, d)
  console.log(`  ✓ ${src}  →  public/garn-eksempler/${dst}`)
}

console.log('\n— Opdaterer xlsx —')
const buf = readFileSync(xlsxPath)
const wb = XLSX.read(buf, { type: 'buffer' })
const sheetName = 'Sheet1'
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' })

// Sæt hero_image_url på 5 eksisterende garner
const SET_IMAGE = [
  { producer: 'Edy Angola', name: 'Alpaca Merino', series: '',     image: '/garn-eksempler/edy-angola-alpaca-merino.jpg' },
  { producer: 'Ístex',      name: 'Léttlopi',      series: 'Lopi', image: '/garn-eksempler/istex-lettlopi.jpg' },
  { producer: 'Mayflower',  name: 'Nordia',        series: '',     image: '/garn-eksempler/mayflower-nordia.jpg' },
  { producer: 'Ístex',      name: 'Einband',       series: 'Lopi', image: '/garn-eksempler/istex-einband.jpg' },
  { producer: 'Ístex',      name: 'Plötulopi',     series: 'Lopi', image: '/garn-eksempler/istex-plotulopi.jpg' },
]
for (const { producer, name, series, image } of SET_IMAGE) {
  const idx = rows.findIndex(
    (r) =>
      String(r.producer).toLowerCase() === producer.toLowerCase()
      && String(r.name).toLowerCase() === name.toLowerCase()
      && String(r.series ?? '').toLowerCase() === (series ?? '').toLowerCase()
  )
  if (idx >= 0) {
    rows[idx].hero_image_url = image
    console.log(`  ✓ ${producer} ${name}${series ? ' / ' + series : ''}  →  hero_image_url`)
  } else {
    console.warn(`  ⚠  Findes ikke i xlsx: ${producer} ${name}${series ? ' / ' + series : ''}`)
  }
}

// Tilføj Katia Linen som nyt garn
const NEW_YARN = {
  producer: 'Katia',
  name: 'Linen',
  series: 'Natural Selection',
  fiber_main: 'bomuld',
  thickness_category: 'dk',
  ball_weight_g: 50,
  length_per_100g_m: 224,
  needle_min_mm: 3.5,
  needle_max_mm: 4,
  gauge_stitches_10cm: 22,
  gauge_rows_10cm: 29,
  gauge_needle_mm: 4,
  twist_structure: '',
  ply_count: '',
  spin_type: 'plied',
  finish: '',
  wash_care: 'maskinvask_30',
  origin_country: '',
  fiber_origin_country: '',
  status: 'i_produktion',
  certifications: '[]',
  seasonal_suitability: '["sommer"]',
  use_cases: '["sommerbluser","tilbehør","tæpper"]',
  description:
    'Linen fra Katias Natural Selection-serie er et DK-vægtet garn af 53% bomuld og 47% lin. Bomulden gør det blødere og lettere at strikke end rent hørgarn, mens hørren giver en kølig drape og struktur. Velegnet til sommerstrik. Kan maskinvaskes ved 30°.',
  hero_image_url: '/garn-eksempler/katia-linen.jpg',
  fibers: '[{"fiber":"bomuld","percentage":53},{"fiber":"hør","percentage":47}]',
}

const idx = rows.findIndex(
  (r) =>
    String(r.producer).toLowerCase() === NEW_YARN.producer.toLowerCase()
    && String(r.name).toLowerCase() === NEW_YARN.name.toLowerCase()
    && String(r.series ?? '').toLowerCase() === (NEW_YARN.series ?? '').toLowerCase()
)
if (idx >= 0) {
  Object.assign(rows[idx], NEW_YARN)
  console.log(`  ✓ Opdateret: ${NEW_YARN.producer} ${NEW_YARN.name}`)
} else {
  rows.push({ id: '', ...NEW_YARN })
  console.log(`  ✓ Tilføjet:  ${NEW_YARN.producer} ${NEW_YARN.name}`)
}

const headers = Object.keys(rows[0])
const newSheet = XLSX.utils.json_to_sheet(rows, { header: headers })
wb.Sheets[sheetName] = newSheet

writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log(`\nFærdig. Skrevet til ${xlsxPath}`)
console.log('Næste skridt: npm run import:yarns')
