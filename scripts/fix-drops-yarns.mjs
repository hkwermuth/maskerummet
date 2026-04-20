/**
 * Engangs-opdatering af Drops-garner i content/yarns.xlsx
 * Kører: node scripts/fix-drops-yarns.mjs
 */
import XLSX from 'xlsx'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const xlsxPath = resolve(here, '..', 'content', 'yarns.xlsx')

const COLS = {
  id: 0, producer: 1, name: 2, series: 3,
  fiber_main: 4, thickness_category: 5,
  ball_weight_g: 6, length_per_100g_m: 7,
  needle_min_mm: 8, needle_max_mm: 9,
  gauge_stitches_10cm: 10, gauge_rows_10cm: 11, gauge_needle_mm: 12,
  twist_structure: 13, ply_count: 14, spin_type: 15, finish: 16,
  wash_care: 17, origin_country: 18, fiber_origin_country: 19,
  status: 20, certifications: 21, seasonal_suitability: 22,
  use_cases: 23, description: 24, hero_image_url: 25, fibers: 26,
}

// Alle updates: { matchName, updates: { colName: value } }
const UPDATES = [
  {
    name: 'Alaska',
    updates: {
      thickness_category: 'aran',
      certifications: '["Oeko-Tex Standard 100 (Class I)"]',
    },
  },
  {
    name: 'Karisma',
    updates: { origin_country: 'EU' },
  },
  {
    name: 'Safran',
    updates: {
      origin_country: 'Tyrkiet',
      fiber_origin_country: 'Egypten',
      description:
        'Go-to bomuldsgarn til sommerstrik og karklude. Enorm farvepalette og skarp pris — under 25 kr per nøgle. OEKO-TEX certificeret. Maskinvask 40°C på skåneprogram.',
    },
  },
  {
    name: 'Air',
    updates: {
      twist_structure:
        'Chainette/blown — fibre blæst ind i en tynd nylon-tube i stedet for klassisk spinding',
      spin_type: 'chainette',
      finish: 'standard',
      status: 'i_produktion',
      seasonal_suitability: '[]',
      use_cases:
        '["lette sweatre","cardigans","oversize strik","babytæpper","tilbehør"]',
      description:
        'Lofty "blown" garn hvor baby-alpaka og merinould blæses ind i en tynd nylon-tube i stedet for at blive spundet. Færdige plagg er 30-35% lettere end tilsvarende tykkelse i klassisk spundet garn. Meget populær til behagelige oversize sweatre.',
    },
  },
  {
    name: 'Flora',
    updates: {
      twist_structure:
        '4-trådet plied fingering, uld + superfin alpaka, medium twist',
      ply_count: 4,
      spin_type: 'plied',
      finish: 'standard',
      status: 'i_produktion',
      seasonal_suitability: '[]',
      use_cases:
        '["sokker","sjaler","colorwork","barnetøj","lette sweatre"]',
      description:
        'Slidstærkt fingering-garn med alpaka-blanding — særligt populær til sokker pga. holdbarheden. Tynd nok til colorwork og sjaler, blød nok til barnetøj.',
    },
  },
  {
    name: 'Baby Merino',
    updates: {
      twist_structure:
        '3-trådet plied, superwash extrafine merino, medium twist',
      ply_count: 3,
      spin_type: 'plied',
      finish: 'superwash',
      origin_country: 'EU',
      fiber_origin_country: 'Sydamerika',
      status: 'i_produktion',
      certifications: '["Oeko-Tex Standard 100 (Class I)"]',
      seasonal_suitability: '[]',
      use_cases:
        '["babytøj","børnestrik","lette sweatre","sjaler","cardigans"]',
      description:
        'Blød, superwash-behandlet extrafine merino til babytøj og lette voksenstrik. Oeko-Tex klasse I certificeret — godkendt til babyer under 3 år. Maskinvask på uldprogram 40°C.',
    },
  },
]

const wb = XLSX.readFile(xlsxPath)
const sheet = wb.Sheets['Sheet1']
const range = XLSX.utils.decode_range(sheet['!ref'])

function setCell(r, c, value, type) {
  const addr = XLSX.utils.encode_cell({ r, c })
  if (value === null || value === undefined || value === '') {
    delete sheet[addr]
    return
  }
  sheet[addr] = { t: type || 's', v: value }
}

function findDropsRow(matchName) {
  for (let r = 1; r <= range.e.r; r++) {
    const producerCell = sheet[XLSX.utils.encode_cell({ r, c: COLS.producer })]
    const nameCell = sheet[XLSX.utils.encode_cell({ r, c: COLS.name })]
    if (
      producerCell &&
      nameCell &&
      String(producerCell.v).toLowerCase() === 'drops' &&
      String(nameCell.v) === matchName
    ) {
      return r
    }
  }
  return -1
}

let changes = 0
for (const { name, updates } of UPDATES) {
  const r = findDropsRow(name)
  if (r < 0) {
    console.error(`  ✗ Kunne ikke finde Drops ${name}`)
    continue
  }
  console.log(`  ✓ Drops ${name} (række ${r + 1})`)
  for (const [col, value] of Object.entries(updates)) {
    const c = COLS[col]
    if (c === undefined) {
      console.error(`    Ukendt kolonne: ${col}`)
      continue
    }
    const type = typeof value === 'number' ? 'n' : 's'
    setCell(r, c, value, type)
    changes++
  }
}

// Slet vildfarne kolonner (kol 27 og 28 indeholder stray data)
const basRow = findDropsRow('Brushed Alpaca Silk')
if (basRow >= 0) {
  for (let c = 27; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: basRow, c })
    if (sheet[addr]) {
      console.log(`  ✓ Slet stray celle på BAS kol ${c}: ${sheet[addr].v}`)
      delete sheet[addr]
      changes++
    }
  }
}

// Trim sheet-range til kolonner 0..26 (drop de to tomme ekstra-kolonner)
const newRange = { s: { r: 0, c: 0 }, e: { r: range.e.r, c: 26 } }
// Først: ryd alle celler i kol 27-28 for alle rækker
for (let r = 0; r <= range.e.r; r++) {
  for (let c = 27; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r, c })
    if (sheet[addr]) delete sheet[addr]
  }
}
sheet['!ref'] = XLSX.utils.encode_range(newRange)

XLSX.writeFile(wb, xlsxPath)
console.log(`\nFærdig: ${changes} ændringer gemt i ${xlsxPath}`)
