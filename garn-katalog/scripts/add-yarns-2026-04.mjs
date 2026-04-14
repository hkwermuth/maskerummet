#!/usr/bin/env node
/**
 * Adds/updates yarn rows in content/yarns.xlsx, then (optionally) adds
 * Knitting for Olive Cotton Merino colors from the official Shopify JSON.
 *
 * Usage:
 *   node scripts/add-yarns-2026-04.mjs
 */
import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { YARN_COLUMNS, COLOR_COLUMNS } from './_yarns-xlsx.mjs'

const ROOT = resolve(process.cwd())
const XLSX_PATH = resolve(ROOT, 'content/yarns.xlsx')

function norm(s) {
  return String(s ?? '').trim()
}

function yarnKey({ producer, name, series }) {
  return `${norm(producer)}|${norm(name)}|${norm(series)}`
}

function withAllYarnColumns(row) {
  const out = {}
  for (const c of YARN_COLUMNS) out[c] = row[c] ?? ''
  return out
}

function withAllColorColumns(row) {
  const out = {}
  for (const c of COLOR_COLUMNS) out[c] = row[c] ?? ''
  return out
}

function metersPer100g({ ball_weight_g, length_m }) {
  if (!ball_weight_g || !length_m) return ''
  const w = Number(ball_weight_g)
  const m = Number(length_m)
  if (!Number.isFinite(w) || !Number.isFinite(m) || w <= 0) return ''
  return +(m * (100 / w)).toFixed(3)
}

function fibersJson(list) {
  if (!list || list.length === 0) return ''
  return JSON.stringify(list.map((f) => ({ fiber: f.fiber, percentage: f.percentage })))
}

const yarnsToAdd = [
  // BC Garn
  {
    producer: 'BC Garn',
    name: 'Bio Balance',
    series: 'GOTS',
    fiber_main: 'uld/bomuld',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 225,
    needle_min_mm: 2,
    needle_max_mm: 3,
    gauge_stitches_10cm: 25,
    wash_care: 'handvask',
    origin_country: 'Tyrkiet',
    fiber_origin_country: 'Tyrkiet',
    status: 'i_produktion',
    certifications: ['GOTS'],
    fibers: [
      { fiber: 'uld', percentage: 55 },
      { fiber: 'bomuld', percentage: 45 },
    ],
  },
  {
    producer: 'BC Garn',
    name: 'Semilla Grosso',
    series: 'GOTS',
    fiber_main: 'uld',
    thickness_category: 'worsted',
    ball_weight_g: 50,
    length_per_ball_m: 80,
    needle_min_mm: 4,
    needle_max_mm: 5,
    gauge_stitches_10cm: 16,
    wash_care: 'maskinvask_30',
    origin_country: 'Italien',
    fiber_origin_country: 'Argentina',
    status: 'i_produktion',
    certifications: ['GOTS'],
    fibers: [{ fiber: 'uld', percentage: 100 }],
  },

  // DROPS
  {
    producer: 'Drops',
    name: 'Flora',
    series: '',
    fiber_main: 'uld/alpaka',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 210,
    needle_min_mm: 3,
    needle_max_mm: 3,
    gauge_stitches_10cm: 24,
    gauge_rows_10cm: 32,
    wash_care: 'handvask',
    origin_country: 'Peru',
    fiber_origin_country: 'Peru',
    status: 'i_produktion',
    certifications: ['Oeko-Tex Standard 100 (Class I)'],
    fibers: [
      { fiber: 'uld', percentage: 65 },
      { fiber: 'alpaka', percentage: 35 },
    ],
  },
  {
    producer: 'Drops',
    name: 'Air',
    series: '',
    fiber_main: 'alpaka/uld/nylon',
    thickness_category: 'aran',
    ball_weight_g: 50,
    length_per_ball_m: 150,
    needle_min_mm: 5,
    needle_max_mm: 5,
    gauge_stitches_10cm: 17,
    gauge_rows_10cm: 22,
    wash_care: 'handvask',
    origin_country: 'Peru/EU',
    fiber_origin_country: 'Peru',
    status: 'i_produktion',
    certifications: ['Oeko-Tex Standard 100 (Class I)'],
    fibers: [
      { fiber: 'baby_alpaka', percentage: 65 },
      { fiber: 'nylon_polyamid', percentage: 28 },
      { fiber: 'merinould', percentage: 7 },
    ],
  },

  // Filcolana
  {
    producer: 'Filcolana',
    name: 'Peruvian',
    series: 'Highland Wool',
    fiber_main: 'uld',
    thickness_category: 'aran',
    ball_weight_g: 50,
    length_per_ball_m: 100,
    needle_min_mm: 4.5,
    needle_max_mm: 5,
    gauge_stitches_10cm: 18,
    gauge_rows_10cm: 25,
    ply_count: 4,
    wash_care: 'handvask',
    origin_country: 'Peru',
    fiber_origin_country: 'Peru',
    status: 'i_produktion',
    fibers: [{ fiber: 'uld', percentage: 100 }],
  },
  {
    producer: 'Filcolana',
    name: 'Anina',
    series: '',
    fiber_main: 'merino',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 210,
    needle_min_mm: 3,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 27,
    gauge_rows_10cm: 40,
    ply_count: 4,
    finish: 'superwash',
    wash_care: 'maskinvask_30',
    origin_country: 'Peru',
    fiber_origin_country: '',
    status: 'i_produktion',
    fibers: [{ fiber: 'merinould', percentage: 100 }],
  },

  // Holst Garn
  {
    producer: 'Holst Garn',
    name: 'Coast',
    series: '',
    fiber_main: 'uld/bomuld',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 350,
    needle_min_mm: 2.5,
    needle_max_mm: 3,
    gauge_stitches_10cm: 26,
    ply_count: 2,
    wash_care: 'maskinvask_30',
    status: 'i_produktion',
    fibers: [
      { fiber: 'merinould', percentage: 55 },
      { fiber: 'bomuld', percentage: 45 },
    ],
  },
  {
    producer: 'Holst Garn',
    name: 'Supersoft',
    series: '',
    fiber_main: 'merino/shetland',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 287,
    needle_min_mm: 3,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 25,
    ply_count: 2,
    wash_care: 'maskinvask_30',
    status: 'i_produktion',
    fibers: [
      { fiber: 'merinould', percentage: 50 },
      { fiber: 'shetland_uld', percentage: 50 },
    ],
  },

  // Gepard
  {
    producer: 'Gepard',
    name: 'CottonWool 5',
    series: 'Organic',
    fiber_main: 'bomuld/merino',
    thickness_category: 'dk',
    ball_weight_g: 50,
    length_per_ball_m: 100,
    needle_min_mm: 4.5,
    needle_max_mm: 5,
    gauge_stitches_10cm: 22,
    wash_care: 'maskinvask_30',
    origin_country: 'Italien',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: ['GOTS (bomuld)', 'Oeko-Tex 100'],
    fibers: [
      { fiber: 'bomuld', percentage: 50 },
      { fiber: 'merinould', percentage: 50 },
    ],
  },
  {
    producer: 'Gepard',
    name: 'Puno',
    series: '',
    fiber_main: 'alpaka/merino/nylon',
    thickness_category: 'bulky',
    ball_weight_g: 50,
    length_per_ball_m: 110,
    needle_min_mm: 5.5,
    needle_max_mm: 8,
    gauge_stitches_10cm: 12.5,
    wash_care: 'handvask',
    status: 'i_produktion',
    certifications: ['RAS', 'RWS'],
    fibers: [
      { fiber: 'baby_alpaka', percentage: 68 },
      { fiber: 'merinould', percentage: 10 },
      { fiber: 'nylon_polyamid', percentage: 22 },
    ],
  },

  // Isager
  {
    producer: 'Isager',
    name: 'Silk Mohair',
    series: '',
    fiber_main: 'mohair/silke',
    thickness_category: 'lace',
    ball_weight_g: 25,
    length_per_ball_m: 212,
    needle_min_mm: 2,
    needle_max_mm: 5,
    wash_care: 'handvask',
    origin_country: 'Italien',
    fiber_origin_country: 'Sydafrika (mohair), silke: ukendt',
    status: 'i_produktion',
    certifications: ['RMS'],
    fibers: [
      { fiber: 'kid_mohair', percentage: 75 },
      { fiber: 'silke', percentage: 25 },
    ],
  },
  {
    producer: 'Isager',
    name: 'Jensen Yarn',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'sport',
    ball_weight_g: 50,
    length_per_ball_m: 125,
    needle_min_mm: 3,
    needle_max_mm: 3,
    gauge_stitches_10cm: 22,
    gauge_rows_10cm: 28,
    gauge_needle_mm: 3,
    ply_count: 3,
    wash_care: 'handvask',
    origin_country: 'Danmark',
    fiber_origin_country: 'New Zealand (hvid), Europa (Gotland: grå/brun)',
    status: 'i_produktion',
    fibers: [{ fiber: 'uld', percentage: 100 }],
  },

  // Knitting for Olive
  {
    producer: 'Knitting for Olive',
    name: 'Heavy Merino',
    series: '',
    fiber_main: 'merino',
    thickness_category: 'worsted',
    ball_weight_g: 50,
    length_per_ball_m: 125,
    needle_min_mm: 4.5,
    needle_max_mm: 4.5,
    gauge_stitches_10cm: 18,
    gauge_rows_10cm: 26,
    wash_care: 'handvask',
    origin_country: 'Italien',
    fiber_origin_country: 'New Zealand',
    status: 'i_produktion',
    certifications: ['Oeko-Tex Standard 100'],
    fibers: [{ fiber: 'merinould', percentage: 100 }],
  },
  {
    producer: 'Knitting for Olive',
    name: 'Cotton Merino',
    series: '',
    fiber_main: 'bomuld/merino',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 250,
    needle_min_mm: 3,
    needle_max_mm: 3,
    gauge_stitches_10cm: 28,
    gauge_rows_10cm: 38,
    gauge_needle_mm: 3,
    wash_care: 'handvask',
    status: 'i_produktion',
    certifications: ['Oeko-Tex Standard 100 (Class 1)', 'RWS', 'OCS'],
    fibers: [
      { fiber: 'bomuld', percentage: 70 },
      { fiber: 'merinould', percentage: 30 },
    ],
  },

  // Lana Grossa
  {
    producer: 'Lana Grossa',
    name: 'Cool Wool',
    series: '',
    fiber_main: 'merino',
    thickness_category: 'sport',
    ball_weight_g: 50,
    length_per_ball_m: 160,
    needle_min_mm: 3,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 24,
    gauge_rows_10cm: 34,
    wash_care: 'maskinvask_30',
    origin_country: 'Italien',
    fiber_origin_country: 'Australien',
    status: 'i_produktion',
    fibers: [{ fiber: 'merinould', percentage: 100 }],
  },

  // Lang Yarns
  {
    producer: 'Lang Yarns',
    name: 'Jawoll',
    series: 'Superwash',
    fiber_main: 'uld/nylon',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 210,
    needle_min_mm: 2.5,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 30,
    gauge_rows_10cm: 41,
    finish: 'superwash',
    wash_care: 'maskinvask_40',
    status: 'i_produktion',
    fiber_origin_country: 'Chile (Patagonia)',
    fibers: [
      { fiber: 'uld', percentage: 75 },
      { fiber: 'nylon_polyamid', percentage: 25 },
    ],
  },
  {
    producer: 'Lang Yarns',
    name: 'Mille Colori Baby',
    series: '',
    fiber_main: 'merino',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_ball_m: 190,
    needle_min_mm: 3,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 27,
    gauge_rows_10cm: 36,
    finish: 'superwash',
    wash_care: 'maskinvask_40',
    status: 'i_produktion',
    fiber_origin_country: 'Australien',
    fibers: [{ fiber: 'merinould', percentage: 100 }],
  },

  // Manos del Uruguay (official specs may be hard to scrape; using published product data)
  {
    producer: 'Manos del Uruguay',
    name: 'Serena',
    series: '',
    fiber_main: 'alpaka/bomuld',
    thickness_category: 'sport',
    ball_weight_g: 50,
    length_per_ball_m: 155,
    needle_min_mm: 3.5,
    needle_max_mm: 4,
    gauge_stitches_10cm: 24,
    wash_care: 'handvask',
    status: 'i_produktion',
    fiber_origin_country: 'Peru (alpaka), bomuld: ukendt',
    fibers: [
      { fiber: 'baby_alpaka', percentage: 60 },
      { fiber: 'bomuld', percentage: 40 },
    ],
  },
  {
    producer: 'Manos del Uruguay',
    name: 'Alegria',
    series: '',
    fiber_main: 'merino/nylon',
    thickness_category: 'fingering',
    ball_weight_g: 100,
    length_per_ball_m: 425,
    needle_min_mm: 2.25,
    needle_max_mm: 3,
    gauge_stitches_10cm: 29,
    finish: 'superwash',
    wash_care: 'maskinvask_40',
    status: 'i_produktion',
    fibers: [
      { fiber: 'merinould', percentage: 75 },
      { fiber: 'nylon_polyamid', percentage: 25 },
    ],
  },

  // Rauma
  {
    producer: 'Rauma Garn',
    name: 'Finull',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'sport',
    ball_weight_g: 50,
    length_per_ball_m: 175,
    needle_min_mm: 2,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 25,
    ply_count: 2,
    wash_care: 'maskinvask_30',
    origin_country: 'Norge',
    fiber_origin_country: 'Norge',
    status: 'i_produktion',
    fibers: [{ fiber: 'uld', percentage: 100 }],
  },

  // Sandnes
  {
    producer: 'Sandnes Garn',
    name: 'Line',
    series: '',
    fiber_main: 'bomuld/viskose/lin',
    thickness_category: 'dk',
    ball_weight_g: 50,
    length_per_ball_m: 110,
    needle_min_mm: 4,
    needle_max_mm: 4,
    gauge_stitches_10cm: 20,
    wash_care: 'maskinvask_30',
    status: 'i_produktion',
    fiber_origin_country: 'Indien',
    fibers: [
      { fiber: 'bomuld', percentage: 53 },
      { fiber: 'viskose', percentage: 33 },
      { fiber: 'lin', percentage: 14 },
    ],
  },
  {
    producer: 'Sandnes Garn',
    name: 'Kos',
    series: '',
    fiber_main: 'alpaka/uld/nylon',
    thickness_category: 'aran',
    ball_weight_g: 50,
    length_per_ball_m: 150,
    needle_min_mm: 4.5,
    needle_max_mm: 5.5,
    gauge_stitches_10cm: 17,
    wash_care: 'maskinvask_30',
    status: 'i_produktion',
    fiber_origin_country: 'Uruguay (uld), Peru (alpaka)',
    fibers: [
      { fiber: 'alpaka', percentage: 62 },
      { fiber: 'nylon_polyamid', percentage: 29 },
      { fiber: 'uld', percentage: 9 },
    ],
  },

  // Schoppel Wolle
  {
    producer: 'Schoppel Wolle',
    name: 'Zauberball Stärke 6',
    series: '',
    fiber_main: 'uld/nylon',
    thickness_category: 'sport',
    ball_weight_g: 150,
    length_per_ball_m: 400,
    needle_min_mm: 3,
    needle_max_mm: 4,
    finish: 'superwash',
    wash_care: 'maskinvask_40',
    status: 'i_produktion',
    fibers: [
      { fiber: 'uld', percentage: 75 },
      { fiber: 'nylon_polyamid', percentage: 25 },
    ],
  },
  {
    producer: 'Schoppel Wolle',
    name: 'Edition 3',
    series: '',
    fiber_main: 'merino',
    thickness_category: 'sport',
    ball_weight_g: 50,
    length_per_ball_m: 150,
    needle_min_mm: 3,
    needle_max_mm: 3.5,
    finish: 'superwash',
    wash_care: 'maskinvask_40',
    status: 'i_produktion',
    fibers: [{ fiber: 'merinould', percentage: 100 }],
  },

  // Tynd Uld / dansk spinderi (specs intentionally minimal for safety)
  {
    producer: 'Tynd Uld / dansk spinderi',
    name: 'Spelsau',
    series: '',
    fiber_main: 'uld',
    thickness_category: '',
    ball_weight_g: '',
    length_per_ball_m: '',
    needle_min_mm: '',
    needle_max_mm: '',
    gauge_stitches_10cm: '',
    wash_care: 'ikke_angivet',
    origin_country: 'Danmark',
    fiber_origin_country: 'Danmark',
    status: 'i_produktion',
    fibers: [{ fiber: 'uld', percentage: 100 }],
  },
]

async function fetchKfoCottonMerinoColorProducts() {
  const base = 'https://knittingforolive.dk/collections/knitting-for-olive-cottonmerino'
  const allPaths = new Set()

  // Shopify collections often paginate; grab multiple pages until no new matches.
  for (let page = 1; page <= 6; page++) {
    const url = page === 1 ? base : `${base}?page=${page}`
    const res = await fetch(url, { headers: { 'user-agent': 'maskerummet-bot' } })
    if (!res.ok) throw new Error(`KFO collection fetch failed: ${res.status} (${url})`)
    const html = await res.text()

    const matches = [
      ...html.matchAll(/href=\"(\/products\/[^\"]*knitting-for-olive[^\"]*(?:cotton-merino|cottonmerino)[^\"]*)\"/gi),
    ]
    const before = allPaths.size
    for (const m of matches) allPaths.add(m[1])
    if (allPaths.size === before) break
  }

  const paths = [...allPaths]
  paths.sort((a, b) => a.localeCompare(b))

  const out = []
  for (const p of paths) {
    const jsUrl = `https://knittingforolive.dk${p}.js`
    const r = await fetch(jsUrl, { headers: { 'user-agent': 'maskerummet-bot' } })
    if (!r.ok) throw new Error(`KFO product js fetch failed: ${r.status} for ${jsUrl}`)
    const data = await r.json()

    const title = String(data.title || '')
    const colorName = title.includes(' - ') ? title.split(' - ').slice(1).join(' - ').trim() : title.trim()
    const featured = data.featured_image ? `https:${data.featured_image}` : ''

    out.push({
      id: '',
      yarn_id: '',
      yarn_lookup: 'Knitting for Olive|Cotton Merino|',
      color_number: '',
      color_name: colorName,
      color_family: '',
      hex_code: '',
      status: '',
      image_url: featured,
    })
  }

  return out
}

async function main() {
  const buf = readFileSync(XLSX_PATH)
  const wb = XLSX.read(buf, { type: 'buffer' })
  if (!wb.SheetNames.includes('yarns')) throw new Error('Missing sheet: yarns')
  if (!wb.SheetNames.includes('colors')) throw new Error('Missing sheet: colors')

  const yarnRows = XLSX.utils.sheet_to_json(wb.Sheets.yarns, { defval: '' })
  const colorRows = XLSX.utils.sheet_to_json(wb.Sheets.colors, { defval: '' })

  const index = new Map(yarnRows.map((r, i) => [yarnKey(r), i]))

  let added = 0
  let updated = 0
  for (const y of yarnsToAdd) {
    const row = {
      id: '',
      producer: y.producer,
      name: y.name,
      series: y.series || '',
      fiber_main: y.fiber_main || '',
      thickness_category: y.thickness_category || '',
      ball_weight_g: y.ball_weight_g === '' ? '' : (y.ball_weight_g ?? ''),
      length_per_100g_m: metersPer100g({ ball_weight_g: y.ball_weight_g, length_m: y.length_per_ball_m }),
      needle_min_mm: y.needle_min_mm ?? '',
      needle_max_mm: y.needle_max_mm ?? '',
      gauge_stitches_10cm: y.gauge_stitches_10cm ?? '',
      gauge_rows_10cm: y.gauge_rows_10cm ?? '',
      gauge_needle_mm: y.gauge_needle_mm ?? '',
      twist_structure: y.twist_structure ?? '',
      ply_count: y.ply_count ?? '',
      spin_type: y.spin_type ?? '',
      finish: y.finish ?? '',
      wash_care: y.wash_care ?? '',
      origin_country: y.origin_country ?? '',
      fiber_origin_country: y.fiber_origin_country ?? '',
      status: y.status ?? '',
      certifications: y.certifications ? JSON.stringify(y.certifications) : '',
      seasonal_suitability: '',
      use_cases: '',
      description: '',
      fibers: fibersJson(y.fibers),
    }

    const key = yarnKey(row)
    if (index.has(key)) {
      yarnRows[index.get(key)] = { ...yarnRows[index.get(key)], ...row }
      updated++
    } else {
      yarnRows.push(withAllYarnColumns(row))
      index.set(key, yarnRows.length - 1)
      added++
    }
  }

  // Add/replace KFO Cotton Merino colors by yarn_lookup.
  const kfoLookup = 'Knitting for Olive|Cotton Merino|'
  const before = colorRows.length
  const filteredColors = colorRows.filter((r) => norm(r.yarn_lookup) !== kfoLookup)
  const kfoColors = await fetchKfoCottonMerinoColorProducts()
  const nextColors = [...filteredColors, ...kfoColors.map(withAllColorColumns)]

  // Write back workbook (stable headers)
  const wsY = XLSX.utils.json_to_sheet(yarnRows, { header: YARN_COLUMNS })
  const wsC = XLSX.utils.json_to_sheet(nextColors, { header: COLOR_COLUMNS })
  wb.Sheets.yarns = wsY
  wb.Sheets.colors = wsC

  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(XLSX_PATH, out)

  console.log(`Updated content/yarns.xlsx`)
  console.log(`Yarns: +${added}, ~${updated} (total ${yarnRows.length})`)
  console.log(`Colors: KFO Cotton Merino replaced (${before} -> ${nextColors.length}, +${kfoColors.length} KFO colors)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

