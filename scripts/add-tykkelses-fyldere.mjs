#!/usr/bin/env node
// One-off: tilføjer 7 garner til content/yarns.xlsx for at fylde tykkelses-huller
// (light fingering, super bulky, jumbo) og udvide DK + aran lidt.
// Specs hentet fra producent-sider 2026-05-06.
// Drops-billeder downloadet til public/garn-eksempler/ samme dag.
// Kør:
//   node scripts/add-tykkelses-fyldere.mjs
//   npm run import:yarns

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

const NEW_YARNS = [
  // ── light fingering ────────────────────────────────────────────────────────
  {
    producer: 'Holst Garn',
    name: 'Coast',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'light_fingering',
    ball_weight_g: 50,
    length_per_100g_m: 700,
    needle_min_mm: 2.5,
    needle_max_mm: 3,
    gauge_stitches_10cm: 26,
    gauge_rows_10cm: '',
    gauge_needle_mm: 3,
    twist_structure: '2-trådet',
    ply_count: 2,
    spin_type: 'plied',
    finish: '',
    wash_care: 'handvask',
    origin_country: 'Danmark',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sjaler","lette bluser","følgegarn"]',
    description:
      'Coast er et meget tyndt 2-trådet garn fra danske Holst Garn, blandet af 55% merinould og 45% bomuld. Bomulden giver tyngde og holdbarhed, mens merinoulden tilfører blødhed og varme. Strikkes ofte sammen med andre garner i fair isle eller dobbelt-tråd.',
    hero_image_url: '',
    fibers: '[{"fiber":"merinould","percentage":55},{"fiber":"bomuld","percentage":45}]',
  },
  {
    producer: 'Filcolana',
    name: 'Saga',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'light_fingering',
    ball_weight_g: 50,
    length_per_100g_m: 600,
    needle_min_mm: 2.5,
    needle_max_mm: 3,
    gauge_stitches_10cm: 26,
    gauge_rows_10cm: 38,
    gauge_needle_mm: 3,
    twist_structure: '2-trådet lambsuld',
    ply_count: 2,
    spin_type: 'plied',
    finish: '',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: 'Falklandsøerne',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sjaler","lette bluser","babytøj"]',
    description:
      'Saga er et tyndt, blødt 2-trådet garn af 100% lambsuld fra Falklandsøerne. Det er let, varmt og elastisk og velegnet til sjaler, lette bluser og babytøj. En god alternativ til klassiske fingering-garner når man ønsker noget endnu tyndere.',
    hero_image_url: '',
    fibers: '[{"fiber":"uld","percentage":100}]',
  },

  // ── DK (ekstra GOTS-certificeret) ──────────────────────────────────────────
  {
    producer: 'BC Garn',
    name: 'Semilla Cable',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'dk',
    ball_weight_g: 50,
    length_per_100g_m: 290,
    needle_min_mm: 3.5,
    needle_max_mm: 4.5,
    gauge_stitches_10cm: 20,
    gauge_rows_10cm: '',
    gauge_needle_mm: 4,
    twist_structure: 'kablet',
    ply_count: '',
    spin_type: 'cabled',
    finish: '',
    wash_care: 'maskinvask_30',
    origin_country: 'Italien',
    fiber_origin_country: 'Argentina',
    status: 'i_produktion',
    certifications: '["GOTS"]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","cardigans","børnetøj","tilbehør"]',
    description:
      'Semilla Cablé er den kablede DK-version af BC Garns Semilla-serie — 100% økologisk uld, GOTS-certificeret og blødt vasket uden klorin. Den kablede konstruktion giver et stabilt og elastisk garn med god maskedefinition. Råvaren er fra GOTS-certificerede gårde i Argentina, spundet og farvet i Italien.',
    hero_image_url: '',
    fibers: '[{"fiber":"uld","percentage":100}]',
  },

  // ── aran ───────────────────────────────────────────────────────────────────
  {
    producer: 'Hjertegarn',
    name: 'Incawool',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'aran',
    ball_weight_g: 100,
    length_per_100g_m: 160,
    needle_min_mm: 4.5,
    needle_max_mm: 5,
    gauge_stitches_10cm: 18,
    gauge_rows_10cm: '',
    gauge_needle_mm: 5,
    twist_structure: 'enkelttrådet højlandsuld',
    ply_count: 1,
    spin_type: 'singles',
    finish: '',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: 'Peru',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","cardigans","huer","tæpper"]',
    description:
      'Incawool er et klassisk enkelt-trådet garn af 100% peruviansk højlandsuld. De fine, glatte fibre giver et blødt men robust garn der holder formen og er behageligt mod huden. Velegnet til varme strik som sweatre, cardigans og tæpper.',
    hero_image_url: '',
    fibers: '[{"fiber":"uld","percentage":100}]',
  },

  // ── super bulky ────────────────────────────────────────────────────────────
  {
    producer: 'Drops',
    name: 'Andes',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'super_bulky',
    ball_weight_g: 100,
    length_per_100g_m: 90,
    needle_min_mm: 8,
    needle_max_mm: 10,
    gauge_stitches_10cm: 10,
    gauge_rows_10cm: 14,
    gauge_needle_mm: 9,
    twist_structure: '2-trådet',
    ply_count: 2,
    spin_type: 'plied',
    finish: '',
    wash_care: 'handvask',
    origin_country: 'Peru',
    fiber_origin_country: 'Sydamerika',
    status: 'i_produktion',
    certifications: '["Oeko-Tex Standard 100"]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","jakker","tæpper","huer"]',
    description:
      'Andes er et blødt og tykt garn spundet af 65% uld og 35% superfin alpaka. Alpakaen giver en silkeagtig overflade og glans, mens ulden bidrager med formstabilitet. Velegnet til hurtige projekter som sweatre, jakker og varme tæpper.',
    hero_image_url: '/garn-eksempler/drops-andes.jpg',
    fibers: '[{"fiber":"uld","percentage":65},{"fiber":"alpaka","percentage":35}]',
  },
  {
    producer: 'Drops',
    name: 'Snow',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'super_bulky',
    ball_weight_g: 50,
    length_per_100g_m: 100,
    needle_min_mm: 8,
    needle_max_mm: 10,
    gauge_stitches_10cm: 10,
    gauge_rows_10cm: 14,
    gauge_needle_mm: 9,
    twist_structure: 'enkelttrådet',
    ply_count: 1,
    spin_type: 'singles',
    finish: '',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: 'Sydamerika',
    status: 'i_produktion',
    certifications: '["Oeko-Tex Standard 100"]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","huer","tørklæder","filtning"]',
    description:
      'Snow (tidligere kaldet Drops Eskimo) er et blødt, tykt enkelt-trådet garn af 100% uld. Fibrene er ubehandlede — kun vasket og ikke kemisk behandlet inden farvning — hvilket fremhæver uldens naturlige egenskaber og giver god form og struktur. Velegnet til filtning.',
    hero_image_url: '/garn-eksempler/drops-snow.jpg',
    fibers: '[{"fiber":"uld","percentage":100}]',
  },

  // ── jumbo ──────────────────────────────────────────────────────────────────
  {
    producer: 'Drops',
    name: 'Polaris',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'jumbo',
    ball_weight_g: 100,
    length_per_100g_m: 36,
    needle_min_mm: 10,
    needle_max_mm: 15,
    gauge_stitches_10cm: 8,
    gauge_rows_10cm: 10,
    gauge_needle_mm: 12,
    twist_structure: 'enkelttrådet',
    ply_count: 1,
    spin_type: 'singles',
    finish: '',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: 'Sydamerika',
    status: 'i_produktion',
    certifications: '["Oeko-Tex Standard 100"]',
    seasonal_suitability: '[]',
    use_cases: '["tæpper","huer","tørklæder","ponchos"]',
    description:
      'Polaris er et af Drops\' tykkeste garner — et enkelt-trådet garn af samme bløde uld som Snow, men meget kraftigere. Strikkes på pinde 10–15 mm og er ideelt til hurtige indretningsprojekter, varme huer, tørklæder og ponchos.',
    hero_image_url: '/garn-eksempler/drops-polaris.jpg',
    fibers: '[{"fiber":"uld","percentage":100}]',
  },
]

let added = 0
let updated = 0
for (const yarn of NEW_YARNS) {
  const existingIdx = rows.findIndex(
    (r) =>
      String(r.producer).toLowerCase() === yarn.producer.toLowerCase()
      && String(r.name).toLowerCase() === yarn.name.toLowerCase()
      && String(r.series ?? '').toLowerCase() === (yarn.series ?? '').toLowerCase()
  )
  if (existingIdx >= 0) {
    Object.assign(rows[existingIdx], yarn)
    console.log(`✓ Opdateret: ${yarn.producer} ${yarn.name}`)
    updated++
  } else {
    rows.push({ id: '', ...yarn })
    console.log(`✓ Tilføjet: ${yarn.producer} ${yarn.name}`)
    added++
  }
}

const headers = Object.keys(rows[0])
const newSheet = XLSX.utils.json_to_sheet(rows, { header: headers })
wb.Sheets[sheetName] = newSheet

writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log(`\n${added} ny, ${updated} opdateret. Skrevet til ${xlsxPath}`)
console.log('Næste skridt: npm run import:yarns')
