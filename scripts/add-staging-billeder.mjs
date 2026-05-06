#!/usr/bin/env node
// One-off: kopierer billeder fra garn-billeder-staging/ til public/garn-eksempler/,
// opdaterer eksisterende garner med hero_image_url, og tilføjer 4 nye garner.
// Specs hentet fra producent-sider 2026-05-06.
// Kør:
//   node scripts/add-staging-billeder.mjs
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

// Filnavn-mapping: source → destination
const IMAGE_COPIES = [
  { src: 'IMG_6018.JPG',  dst: 'knitting-for-olive-merino.jpg' },
  { src: 'IMG_6022.JPEG', dst: 'isager-alpaca-2.jpg' },
  { src: 'IMG_6019.JPG',  dst: 'lang-yarns-merino-120.jpg' },
  { src: 'IMG_6023.JPG',  dst: 'isager-trio-1.jpg' },
  { src: 'IMG_6024.JPEG', dst: 'isager-soft.jpg' },
  { src: 'IMG_6029.JPG',  dst: 'kit-couture-cashmere.jpg' },
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

// 1) Sæt hero_image_url på 2 eksisterende garner
const SET_IMAGE = [
  { producer: 'Knitting for Olive', name: 'Merino',   image: '/garn-eksempler/knitting-for-olive-merino.jpg' },
  { producer: 'Isager',             name: 'Alpaca 2', image: '/garn-eksempler/isager-alpaca-2.jpg' },
]
for (const { producer, name, image } of SET_IMAGE) {
  const idx = rows.findIndex(
    (r) =>
      String(r.producer).toLowerCase() === producer.toLowerCase()
      && String(r.name).toLowerCase() === name.toLowerCase()
  )
  if (idx >= 0) {
    rows[idx].hero_image_url = image
    console.log(`  ✓ ${producer} ${name}  →  hero_image_url`)
  } else {
    console.warn(`  ⚠  Findes ikke i xlsx: ${producer} ${name}`)
  }
}

// 2) Tilføj 4 nye garner
const NEW_YARNS = [
  {
    producer: 'Lang Yarns',
    name: 'Merino 120',
    series: '',
    fiber_main: 'merinould',
    thickness_category: 'dk',
    ball_weight_g: 50,
    length_per_100g_m: 240,
    needle_min_mm: 3.5,
    needle_max_mm: 4.5,
    gauge_stitches_10cm: 22,
    gauge_rows_10cm: '',
    gauge_needle_mm: 4,
    twist_structure: '',
    ply_count: '',
    spin_type: 'plied',
    finish: 'superwash',
    wash_care: 'maskinvask_30',
    origin_country: '',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","cardigans","tilbehør","babytøj"]',
    description:
      'Merino 120 er et klassisk DK-garn af 100% merinould (extrafine), superwash-behandlet så det kan maskinvaskes. Velegnet til hverdagsstrik, babytøj og tilbehør hvor pleje skal være enkel.',
    hero_image_url: '/garn-eksempler/lang-yarns-merino-120.jpg',
    fibers: '[{"fiber":"merinould","percentage":100}]',
  },
  {
    producer: 'Isager',
    name: 'Trio 1',
    series: '',
    fiber_main: 'hør',
    thickness_category: 'light_fingering',
    ball_weight_g: 50,
    length_per_100g_m: 700,
    needle_min_mm: 2.5,
    needle_max_mm: 3,
    gauge_stitches_10cm: 26,
    gauge_rows_10cm: '',
    gauge_needle_mm: 3,
    twist_structure: '3-trådet',
    ply_count: 3,
    spin_type: 'plied',
    finish: '',
    wash_care: 'handvask',
    origin_country: 'Italien',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '["sommer"]',
    use_cases: '["sommerbluser","sjaler","tørklæder","lette projekter"]',
    description:
      'Trio 1 er et tyndt 3-trådet plante-garn af 50% hør, 30% bomuld og 20% tencel. Det har en let, kølig karakter og er velegnet til sommerstrik som lette bluser og sjaler. Spundet og farvet i Italien.',
    hero_image_url: '/garn-eksempler/isager-trio-1.jpg',
    fibers: '[{"fiber":"hør","percentage":50},{"fiber":"bomuld","percentage":30},{"fiber":"tencel","percentage":20}]',
  },
  {
    producer: 'Isager',
    name: 'Soft',
    series: '',
    fiber_main: 'alpaka',
    thickness_category: 'bulky',
    ball_weight_g: 50,
    length_per_100g_m: 250,
    needle_min_mm: 5.5,
    needle_max_mm: 6,
    gauge_stitches_10cm: 16,
    gauge_rows_10cm: 25,
    gauge_needle_mm: 6,
    twist_structure: 'luftigt blanding',
    ply_count: '',
    spin_type: 'plied',
    finish: '',
    wash_care: 'handvask',
    origin_country: 'Peru',
    fiber_origin_country: 'Peru',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","jakker","tæpper","huer"]',
    description:
      'Soft er et blødt, luftigt garn af 56% alpaka og 44% økologisk bomuld. Alpakaen giver varme og glans, mens bomulden tilfører tyngde og struktur. Velegnet til hurtige projekter og varme strik.',
    hero_image_url: '/garn-eksempler/isager-soft.jpg',
    fibers: '[{"fiber":"alpaka","percentage":56},{"fiber":"oekologisk_bomuld","percentage":44}]',
  },
  {
    producer: 'Kit Couture',
    name: 'Cashmere',
    series: '',
    fiber_main: 'kashmir',
    thickness_category: 'light_fingering',
    ball_weight_g: 25,
    length_per_100g_m: 700,
    needle_min_mm: 2.5,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 28,
    gauge_rows_10cm: '',
    gauge_needle_mm: 3,
    twist_structure: '',
    ply_count: '',
    spin_type: 'plied',
    finish: '',
    wash_care: 'handvask',
    origin_country: 'Italien',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","cardigans","tørklæder","luksus-projekter"]',
    description:
      'Cashmere fra Kit Couture er et tyndt, blødt og temperatur-regulerende garn af 100% kashmir. Det er produceret hos Kit Coutures faste italienske spinderi i Norditalien. Perfekt til luksuriøse projekter hvor blødhed mod huden er afgørende.',
    hero_image_url: '/garn-eksempler/kit-couture-cashmere.jpg',
    fibers: '[{"fiber":"kashmir","percentage":100}]',
  },
]

let added = 0
let updated = 0
for (const yarn of NEW_YARNS) {
  const idx = rows.findIndex(
    (r) =>
      String(r.producer).toLowerCase() === yarn.producer.toLowerCase()
      && String(r.name).toLowerCase() === yarn.name.toLowerCase()
      && String(r.series ?? '').toLowerCase() === (yarn.series ?? '').toLowerCase()
  )
  if (idx >= 0) {
    Object.assign(rows[idx], yarn)
    console.log(`  ✓ Opdateret: ${yarn.producer} ${yarn.name}`)
    updated++
  } else {
    rows.push({ id: '', ...yarn })
    console.log(`  ✓ Tilføjet:  ${yarn.producer} ${yarn.name}`)
    added++
  }
}

const headers = Object.keys(rows[0])
const newSheet = XLSX.utils.json_to_sheet(rows, { header: headers })
wb.Sheets[sheetName] = newSheet

writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log(`\n${added} ny, ${updated} opdateret. Skrevet til ${xlsxPath}`)
console.log('Næste skridt: npm run import:yarns')
