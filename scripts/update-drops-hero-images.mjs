/**
 * Engangs-opdatering: sætter hero_image_url for alle 10 DROPS-garner
 * i content/yarns.xlsx til de nyligt downloadede /garn-eksempler/drops-*.jpg.
 * Kører: node scripts/update-drops-hero-images.mjs
 */
import XLSX from 'xlsx'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const xlsxPath = resolve(here, '..', 'content', 'yarns.xlsx')

const COLS = {
  producer: 1,
  name: 2,
  hero_image_url: 25,
}

const HERO = {
  Air: '/garn-eksempler/drops-air.jpg',
  Alaska: '/garn-eksempler/drops-alaska.jpg',
  Alpaca: '/garn-eksempler/drops-alpaca.jpg',
  'Brushed Alpaca Silk': '/garn-eksempler/drops-brushed-alpaca-silk.jpg',
  Flora: '/garn-eksempler/drops-flora.jpg',
  Karisma: '/garn-eksempler/drops-karisma.jpg',
  'Merino Extra Fine': '/garn-eksempler/drops-merino-extra-fine.jpg',
  Safran: '/garn-eksempler/drops-safran.jpg',
  'Baby Merino': '/garn-eksempler/drops-baby-merino.jpg',
  'Kid-Silk': '/garn-eksempler/drops-kid-silk.jpg',
}

const wb = XLSX.readFile(xlsxPath)
const sheet = wb.Sheets['Sheet1']
const range = XLSX.utils.decode_range(sheet['!ref'])

let changes = 0
for (let r = 1; r <= range.e.r; r++) {
  const producer = sheet[XLSX.utils.encode_cell({ r, c: COLS.producer })]
  const name = sheet[XLSX.utils.encode_cell({ r, c: COLS.name })]
  if (!producer || !name) continue
  if (String(producer.v).toLowerCase() !== 'drops') continue
  const url = HERO[String(name.v)]
  if (!url) {
    console.log(`  ? Drops ${name.v} — ingen URL angivet, springer over`)
    continue
  }
  const addr = XLSX.utils.encode_cell({ r, c: COLS.hero_image_url })
  const before = sheet[addr]?.v ?? '(tom)'
  sheet[addr] = { t: 's', v: url }
  console.log(`  ✓ Drops ${name.v}: ${before} → ${url}`)
  changes++
}

XLSX.writeFile(wb, xlsxPath)
console.log(`\nFærdig: ${changes} ændringer gemt i ${xlsxPath}`)
