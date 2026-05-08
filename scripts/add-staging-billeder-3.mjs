#!/usr/bin/env node
// Runde 3: kopierer 13 billeder fra garn-billeder-staging/ til public/garn-eksempler/,
// opdaterer 5 eksisterende garner med hero_image_url, og tilføjer 8 nye garner.
// Specs hentet fra producent-sider 2026-05-08.
// Kør:
//   node scripts/add-staging-billeder-3.mjs
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
  { src: 'IMG_6137.JPEG', dst: 'lana-grossa-cool-wool.jpg' },
  { src: 'IMG_6138.JPEG', dst: 'lang-yarns-jawoll-superwash.jpg' },
  { src: 'IMG_6139.JPEG', dst: 'bc-garn-bio-balance.jpg' },
  { src: 'IMG_6141.JPEG', dst: 'hjertegarn-borstet-uld.jpg' },
  { src: 'IMG_6143.JPEG', dst: 'hjertegarn-extrafine-merino-90.jpg' },
  { src: 'IMG_6144.JPEG', dst: 'hjertegarn-bamboo-wool.jpg' },
  { src: 'IMG_6145.JPEG', dst: 'bc-garn-semilla-grosso.jpg' },
  { src: 'IMG_6147.JPEG', dst: 'hjertegarn-new-arezzo.jpg' },
  { src: 'IMG_6148.JPEG', dst: 'hjertegarn-alpaca-400.jpg' },
  { src: 'IMG_6150.JPEG', dst: 'nordic-sky-kiruna.jpg' },
  { src: 'IMG_6151.JPEG', dst: 'hjertegarn-dream-air.jpg' },
  { src: 'IMG_6152.JPEG', dst: 'hjertegarn-brushed-armonia.jpg' },
  { src: 'IMG_6153.JPEG', dst: 'hjertegarn-lima.jpg' },
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

// 5 eksisterende garner — kun hero_image_url
const SET_IMAGE = [
  { producer: 'Lana Grossa', name: 'Cool Wool',           series: '',          image: '/garn-eksempler/lana-grossa-cool-wool.jpg' },
  { producer: 'Lang Yarns',  name: 'Jawoll',              series: 'Superwash', image: '/garn-eksempler/lang-yarns-jawoll-superwash.jpg' },
  { producer: 'BC Garn',     name: 'Bio Balance',         series: 'GOTS',      image: '/garn-eksempler/bc-garn-bio-balance.jpg' },
  { producer: 'Hjertegarn',  name: 'Extrafine Merino 90', series: '',          image: '/garn-eksempler/hjertegarn-extrafine-merino-90.jpg' },
  { producer: 'BC Garn',     name: 'Semilla Grosso',      series: 'GOTS',      image: '/garn-eksempler/bc-garn-semilla-grosso.jpg' },
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

// 8 nye garner
const NEW_YARNS = [
  {
    producer: 'Hjertegarn',
    name: 'Børstet Uld',
    series: '',
    fiber_main: 'uld/alpaka',
    thickness_category: 'bulky',
    ball_weight_g: 50,
    length_per_100g_m: 300,
    needle_min_mm: 7,
    needle_max_mm: 8,
    gauge_stitches_10cm: 14,
    gauge_rows_10cm: '',
    gauge_needle_mm: 7,
    twist_structure: '',
    ply_count: '',
    spin_type: 'brushed_singles',
    finish: 'brushed',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '["vinter"]',
    use_cases: '["sweatre","jakker","huer","tørklæder","tæpper"]',
    description:
      'Børstet Uld fra Hjertegarn er et luftigt, lodden garn af 57% uld, 25% alpaka og 18% nylon. Den børstede overflade giver varme og volumen uden at gøre strikket tungt. Velegnet til hurtige projekter på pind 7-8 — sweatre, jakker og varme tilbehør.',
    hero_image_url: '/garn-eksempler/hjertegarn-borstet-uld.jpg',
    fibers: '[{"fiber":"uld","percentage":57},{"fiber":"alpaka","percentage":25},{"fiber":"nylon_polyamid","percentage":18}]',
  },
  {
    producer: 'Hjertegarn',
    name: 'Bamboo Wool',
    series: '',
    fiber_main: 'uld-blanding',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_100g_m: 400,
    needle_min_mm: 2.5,
    needle_max_mm: 3,
    gauge_stitches_10cm: 28,
    gauge_rows_10cm: '',
    gauge_needle_mm: 3,
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
    use_cases: '["sokker","strømper","lette sweatre","babytøj"]',
    description:
      'Bamboo Wool fra Hjertegarn er et fingering-vægtet sok-/pulover-garn af 55% uld superwash, 30% bambus-viskose og 15% nylon. Bambusandelen giver et let, kølende skær og glat overflade, mens superwash-uld og nylon gør det slidstærkt — perfekt til sokker. Kan maskinvaskes ved uldprogram 30°.',
    hero_image_url: '/garn-eksempler/hjertegarn-bamboo-wool.jpg',
    fibers: '[{"fiber":"uld","percentage":55},{"fiber":"viskose","percentage":30},{"fiber":"nylon_polyamid","percentage":15}]',
  },
  {
    producer: 'Hjertegarn',
    name: 'New Arezzo',
    series: '',
    fiber_main: 'plantefiber-blanding',
    thickness_category: 'sport',
    ball_weight_g: 50,
    length_per_100g_m: 300,
    needle_min_mm: 3,
    needle_max_mm: 3.5,
    gauge_stitches_10cm: 26,
    gauge_rows_10cm: '',
    gauge_needle_mm: 3,
    twist_structure: '',
    ply_count: '',
    spin_type: 'plied',
    finish: '',
    wash_care: 'maskinvask_40',
    origin_country: '',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '["sommer"]',
    use_cases: '["sommerbluser","tilbehør","lette projekter"]',
    description:
      'New Arezzo fra Hjertegarn er et plantegarn af 47% bambus-viskose, 33% hør og 20% bomuld. Bambus tilfører blødhed og glans, mens hør giver struktur og kølig drape — ideelt til sommerstrik som lette bluser og tilbehør. Strikkes på pind 3-3½ med ca. 26 masker pr. 10 cm.',
    hero_image_url: '/garn-eksempler/hjertegarn-new-arezzo.jpg',
    fibers: '[{"fiber":"viskose","percentage":47},{"fiber":"hør","percentage":33},{"fiber":"bomuld","percentage":20}]',
  },
  {
    producer: 'Hjertegarn',
    name: 'Alpaca 400',
    series: '',
    fiber_main: 'alpaka',
    thickness_category: 'lace',
    ball_weight_g: 50,
    length_per_100g_m: 800,
    needle_min_mm: 2,
    needle_max_mm: 3,
    gauge_stitches_10cm: 30,
    gauge_rows_10cm: '',
    gauge_needle_mm: 2.5,
    twist_structure: '',
    ply_count: '',
    spin_type: 'singles',
    finish: '',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sjaler","tørklæder","blonder","følgegarn"]',
    description:
      'Alpaca 400 fra Hjertegarn er et tyndt lace-garn af 100% alpaka med 400 m pr. 50 g. Velegnet til sjaler og fine tørklæder, eller som følgegarn der gør tykkere garner blødere og lettere. Strikkes på pind 2-3 med ca. 30 masker pr. 10 cm. Håndvaskes.',
    hero_image_url: '/garn-eksempler/hjertegarn-alpaca-400.jpg',
    fibers: '[{"fiber":"alpaka","percentage":100}]',
  },
  {
    producer: 'Hjertegarn',
    name: 'Dream Air',
    series: '',
    fiber_main: 'uld/alpaka/nylon',
    thickness_category: 'bulky',
    ball_weight_g: 50,
    length_per_100g_m: 400,
    needle_min_mm: 6,
    needle_max_mm: 6,
    gauge_stitches_10cm: 17,
    gauge_rows_10cm: '',
    gauge_needle_mm: 6,
    twist_structure: '',
    ply_count: '',
    spin_type: 'brushed_singles',
    finish: 'brushed',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '["vinter"]',
    use_cases: '["sweatre","cardigans","jakker","tæpper"]',
    description:
      'Dream Air fra Hjertegarn er et fabelagtigt blødt og luftigt børstet garn af 53% uld, 22% alpaka og 25% nylon. Trods tyngden strikker det op til en let og varm trøje — som at have luft på kroppen. Strikkes på pind 6 med ca. 17 masker pr. 10 cm. Håndvaskes.',
    hero_image_url: '/garn-eksempler/hjertegarn-dream-air.jpg',
    fibers: '[{"fiber":"uld","percentage":53},{"fiber":"nylon_polyamid","percentage":25},{"fiber":"alpaka","percentage":22}]',
  },
  {
    producer: 'Hjertegarn',
    name: 'Brushed Armonia',
    series: '',
    fiber_main: 'merino/nylon',
    thickness_category: 'fingering',
    ball_weight_g: 50,
    length_per_100g_m: 400,
    needle_min_mm: 3,
    needle_max_mm: 4,
    gauge_stitches_10cm: 28,
    gauge_rows_10cm: '',
    gauge_needle_mm: 3,
    twist_structure: '',
    ply_count: '',
    spin_type: 'brushed_singles',
    finish: 'brushed',
    wash_care: 'maskinvask_30',
    origin_country: '',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","cardigans","tilbehør","babytøj"]',
    description:
      'Brushed Armonia (Børstet Superfine Merino) fra Hjertegarn er et blødt, let børstet 4-trådet garn af 75% superwash merinould og 25% nylon. Børstningen giver et delikat halo, mens nylonet sikrer holdbarhed. Kan maskinvaskes ved uldprogram 30°. Strikkes på pind 3-4.',
    hero_image_url: '/garn-eksempler/hjertegarn-brushed-armonia.jpg',
    fibers: '[{"fiber":"merinould","percentage":75},{"fiber":"nylon_polyamid","percentage":25}]',
  },
  {
    producer: 'Hjertegarn',
    name: 'Lima',
    series: '',
    fiber_main: 'uld',
    thickness_category: 'worsted',
    ball_weight_g: 50,
    length_per_100g_m: 200,
    needle_min_mm: 4.5,
    needle_max_mm: 5,
    gauge_stitches_10cm: 20,
    gauge_rows_10cm: '',
    gauge_needle_mm: 5,
    twist_structure: '',
    ply_count: '',
    spin_type: 'plied',
    finish: '',
    wash_care: 'handvask',
    origin_country: '',
    fiber_origin_country: 'Peru',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","huer","vanter","tilbehør","filtning"]',
    description:
      'Lima fra Hjertegarn er et worsted-vægtet garn af 100% blød uld fra Peru. Garnet kradser mindre end mange tilsvarende kvaliteter og er velegnet til både børne- og voksenstrik. Kan filtes. Strikkes på pind 4½-5 med ca. 20 masker pr. 10 cm. Håndvaskes ved 30°.',
    hero_image_url: '/garn-eksempler/hjertegarn-lima.jpg',
    fibers: '[{"fiber":"uld","percentage":100}]',
  },
  {
    producer: 'Nordic Sky',
    name: 'Kiruna',
    series: '',
    fiber_main: 'alpaka/merino/nylon',
    thickness_category: 'worsted',
    ball_weight_g: 50,
    length_per_100g_m: 300,
    needle_min_mm: 5,
    needle_max_mm: 5,
    gauge_stitches_10cm: 17,
    gauge_rows_10cm: 22,
    gauge_needle_mm: 5,
    twist_structure: '',
    ply_count: '',
    spin_type: 'chainette',
    finish: '',
    wash_care: 'handvask',
    origin_country: 'Sverige',
    fiber_origin_country: '',
    status: 'i_produktion',
    certifications: '[]',
    seasonal_suitability: '[]',
    use_cases: '["sweatre","cardigans","huer","tørklæder"]',
    description:
      'Kiruna fra svenske Nordic Sky er et "blow yarn" af 63% baby-alpaka, 30% nylon og 7% merino. Fibrene blæses gennem et chainette-rør i stedet for at blive spundet på traditionel vis — det giver et meget let, blødt og volumiøst garn. Strikkes på pind 5 med 17 masker og 22 pinde pr. 10 cm. Håndvaskes ved 30°.',
    hero_image_url: '/garn-eksempler/nordic-sky-kiruna.jpg',
    fibers: '[{"fiber":"baby_alpaka","percentage":63},{"fiber":"nylon_polyamid","percentage":30},{"fiber":"merinould","percentage":7}]',
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
