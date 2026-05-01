/**
 * Engangs-script: downloader alle DROPS Kid-Silk farveswatches fra
 * garnstudio.com, sampler centrum-pixel som hex-kode, og udskriver
 * en JS-array klar til at lime ind i lib/data/colorSeeds/drops-kid-silk.mjs.
 *
 * Kører: node scripts/sample-drops-kid-silk-colors.mjs
 */
import { Jimp } from 'jimp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const cacheDir = resolve(here, '..', '.cache', 'drops-kid-silk-swatches')

// Komplet farveliste fra garnstudio.com (71 farver, marts 2026)
const COLORS = [
  { code: '01', nameEn: 'off white' },
  { code: '02', nameEn: null },
  { code: '03', nameEn: 'light pink' },
  { code: '04', nameEn: 'old pink' },
  { code: '05', nameEn: null },
  { code: '07', nameEn: null },
  { code: '08', nameEn: null },
  { code: '09', nameEn: null },
  { code: '10', nameEn: null },
  { code: '11', nameEn: null },
  { code: '12', nameEn: 'beige' },
  { code: '13', nameEn: 'pink' },
  { code: '14', nameEn: 'red' },
  { code: '15', nameEn: 'dark brown' },
  { code: '16', nameEn: null },
  { code: '17', nameEn: 'dark rose' },
  { code: '18', nameEn: null },
  { code: '19', nameEn: null },
  { code: '20', nameEn: 'light beige' },
  { code: '21', nameEn: null },
  { code: '22', nameEn: null },
  { code: '24', nameEn: null },
  { code: '27', nameEn: null },
  { code: '28', nameEn: null },
  { code: '29', nameEn: 'vanilla' },
  { code: '30', nameEn: 'curry' },
  { code: '31', nameEn: 'mauve' },
  { code: '32', nameEn: 'raspberry' },
  { code: '33', nameEn: 'rust' },
  { code: '34', nameEn: null },
  { code: '35', nameEn: 'chocolate' },
  { code: '37', nameEn: null },
  { code: '38', nameEn: 'chalk' },
  { code: '39', nameEn: null },
  { code: '40', nameEn: 'pink pearl' },
  { code: '41', nameEn: 'powder' },
  { code: '42', nameEn: 'almond' },
  { code: '44', nameEn: 'moonlight' },
  { code: '45', nameEn: null },
  { code: '46', nameEn: 'cherry sorbet' },
  { code: '47', nameEn: null },
  { code: '48', nameEn: null },
  { code: '49', nameEn: 'electric orange' },
  { code: '50', nameEn: 'caramel' },
  { code: '51', nameEn: 'toffee' },
  { code: '52', nameEn: 'lemonade' },
  { code: '53', nameEn: 'light peach' },
  { code: '54', nameEn: 'bright sand' },
  { code: '55', nameEn: null },
  { code: '56', nameEn: 'marzipan' },
  { code: '58', nameEn: null },
  { code: '59', nameEn: null },
  { code: '60', nameEn: null },
  { code: '61', nameEn: 'hot red' },
  { code: '62', nameEn: 'strawberry ice cream' },
  { code: '63', nameEn: 'powder pink' },
  { code: '64', nameEn: null },
  { code: '65', nameEn: null },
  { code: '66', nameEn: null },
  { code: '67', nameEn: null },
  { code: '68', nameEn: 'maroon' },
  { code: '69', nameEn: 'ruby wine' },
  { code: '70', nameEn: 'bordeaux' },
  { code: '71', nameEn: null },
  { code: '72', nameEn: 'pastel pink' },
  { code: '73', nameEn: 'misty yellow' },
  { code: '74', nameEn: 'morning fog' },
  { code: '75', nameEn: null },
  { code: '76', nameEn: 'walnut' },
  { code: '77', nameEn: null },
  { code: '78', nameEn: 'sun kiss' },
]

await mkdir(cacheDir, { recursive: true })

function toHex(n) {
  return n.toString(16).padStart(2, '0').toUpperCase()
}

async function downloadSwatch(code) {
  const cachePath = resolve(cacheDir, `${code}.jpg`)
  if (existsSync(cachePath)) return cachePath
  const url = `https://images.garnstudio.com/img/shademap/kid-silk/${code}.jpg`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(cachePath, buf)
  return cachePath
}

async function sampleHex(path) {
  const img = await Jimp.read(path)
  const cx = Math.floor(img.bitmap.width / 2)
  const cy = Math.floor(img.bitmap.height / 2)
  // Snit 9x9 region omkring centrum for at undgå støj/tekst
  let r = 0, g = 0, b = 0, n = 0
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const px = img.getPixelColor(cx + dx, cy + dy)
      // Jimp 1.x: px er 0xRRGGBBAA
      r += (px >>> 24) & 0xff
      g += (px >>> 16) & 0xff
      b += (px >>> 8) & 0xff
      n++
    }
  }
  return `#${toHex(Math.round(r / n))}${toHex(Math.round(g / n))}${toHex(Math.round(b / n))}`
}

const out = []
for (const { code, nameEn } of COLORS) {
  try {
    const path = await downloadSwatch(code)
    const hex = await sampleHex(path)
    out.push({ code, nameEn, hex })
    console.log(`  ${code}  ${hex}  ${nameEn ?? ''}`)
  } catch (err) {
    console.error(`  ${code}  FAIL: ${err.message}`)
    out.push({ code, nameEn, hex: null })
  }
}

const jsonPath = resolve(here, '..', '.cache', 'drops-kid-silk-colors.json')
await writeFile(jsonPath, JSON.stringify(out, null, 2))
console.log(`\nFærdig — ${out.length} farver, gemt til ${jsonPath}`)
