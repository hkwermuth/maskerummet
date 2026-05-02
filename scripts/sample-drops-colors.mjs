/**
 * Engangs-script: downloader alle DROPS-farveswatches fra garnstudio.com
 * for 9 garner, sampler centrum-pixel som hex-kode, og skriver én seed-fil
 * pr. garn til lib/data/colorSeeds/drops-<slug>.mjs.
 *
 * Kører: node scripts/sample-drops-colors.mjs [--yarn=Air]  (filter, valgfri)
 *
 * Bruger Jimp 1.x (allerede i devDependencies via Kid-Silk-importen).
 * Idempotent ift. cache: gemte swatches genbruges, så re-run er gratis.
 */
import { Jimp } from 'jimp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const cacheRoot = resolve(here, '..', '.cache')

// ── Konfig ────────────────────────────────────────────────────────────────────
// Farve-koder + engelske navne hentet fra garnstudio.com 2026-05-02 via WebFetch.
// Slug = den del der står efter /shademap/ i swatch-URL'en.

const DROPS_YARNS = [
  {
    yarnName: 'Air',
    slug: 'air',
    entries: [
      { code: '01', nameEn: 'off white' },
      { code: '02', nameEn: 'wheat' },
      { code: '03', nameEn: 'pearl grey' },
      { code: '04', nameEn: 'medium grey' },
      { code: '05', nameEn: 'brown' },
      { code: '06', nameEn: 'anthracite' },
      { code: '07', nameEn: 'ruby red' },
      { code: '08', nameEn: 'light pink' },
      { code: '09', nameEn: 'navy blue' },
      { code: '10', nameEn: 'fog' },
      { code: '11', nameEn: 'peacock blue' },
      { code: '13', nameEn: 'rust' },
      { code: '14', nameEn: 'heather' },
      { code: '15', nameEn: 'purple haze' },
      { code: '16', nameEn: 'blue' },
      { code: '17', nameEn: 'denim blue' },
      { code: '22', nameEn: 'yellow' },
      { code: '24', nameEn: 'pink' },
      { code: '26', nameEn: 'beige' },
      { code: '27', nameEn: 'aquamarine' },
      { code: '29', nameEn: 'mauve' },
      { code: '32', nameEn: 'blush' },
      { code: '33', nameEn: 'pink sand' },
      { code: '34', nameEn: 'pink marble' },
      { code: '35', nameEn: 'clay' },
      { code: '36', nameEn: 'light blue' },
      { code: '37', nameEn: 'bluebird' },
      { code: '38', nameEn: 'electric orange' },
      { code: '39', nameEn: 'magenta' },
      { code: '40', nameEn: 'lemonade' },
      { code: '41', nameEn: 'sweet orchid' },
      { code: '44', nameEn: 'crimson red' },
      { code: '49', nameEn: 'acorn' },
      { code: '50', nameEn: 'peach pink' },
      { code: '51', nameEn: 'desert rose' },
      { code: '52', nameEn: 'rose petal' },
      { code: '53', nameEn: 'strawberry ice cream' },
      { code: '54', nameEn: 'sweet apricot' },
      { code: '55', nameEn: 'light beige' },
      { code: '57', nameEn: 'bordeaux' },
      { code: '58', nameEn: 'dark grape' },
      { code: '59', nameEn: 'ruby wine' },
      { code: '61', nameEn: 'hot red' },
      { code: '62', nameEn: 'dark blue' },
      { code: '63', nameEn: 'dark navy' },
      { code: '64', nameEn: 'raspberry sorbet' },
      { code: '65', nameEn: 'light yellow' },
    ],
  },
  {
    yarnName: 'Alaska',
    slug: 'alaska',
    entries: [
      { code: '02', nameEn: 'off white' },
      { code: '69', nameEn: 'pearl white' },
      { code: '63', nameEn: 'pearl grey' },
      { code: '03', nameEn: 'light grey' },
      { code: '04', nameEn: 'grey' },
      { code: '05', nameEn: 'dark grey' },
      { code: '55', nameEn: 'nougat' },
      { code: '49', nameEn: 'ash brown' },
      { code: '61', nameEn: 'wheat' },
      { code: '73', nameEn: 'sand' },
      { code: '68', nameEn: 'peanut' },
      { code: '76', nameEn: 'almond' },
      { code: '77', nameEn: 'chestnut' },
      { code: '70', nameEn: 'chocolate' },
      { code: '71', nameEn: 'cinnamon' },
      { code: '66', nameEn: 'toffee' },
      { code: '58', nameEn: 'mustard' },
      { code: '10', nameEn: 'red' },
      { code: '11', nameEn: 'dark red' },
      { code: '78', nameEn: 'dark grape' },
      { code: '81', nameEn: 'plum wine' },
      { code: '80', nameEn: 'ruby red' },
      { code: '79', nameEn: 'pink chalk' },
      { code: '40', nameEn: 'lavender pink' },
      { code: '57', nameEn: 'denim blue' },
      { code: '37', nameEn: 'dark blue' },
      { code: '12', nameEn: 'navy blue' },
      { code: '15', nameEn: 'midnight blue' },
      { code: '72', nameEn: 'peacock blue' },
      { code: '52', nameEn: 'dark turquoise' },
      { code: '62', nameEn: 'fog' },
      { code: '65', nameEn: 'light sea green' },
      { code: '64', nameEn: 'north sea' },
      { code: '74', nameEn: 'dark ivy' },
      { code: '75', nameEn: 'sage green' },
      { code: '45', nameEn: 'light olive' },
      { code: '51', nameEn: 'olive' },
      { code: '06', nameEn: 'black' },
    ],
  },
  {
    yarnName: 'Alpaca',
    slug: 'alpaca',
    entries: [
      { code: '101', nameEn: 'white' },
      { code: '100', nameEn: 'off white' },
      { code: '9039', nameEn: 'sand' },
      { code: '9036', nameEn: 'wheat' },
      { code: '302', nameEn: 'camel' },
      { code: '9031', nameEn: 'almond' },
      { code: '2020', nameEn: 'light nougat' },
      { code: '618', nameEn: 'nougat' },
      { code: '607', nameEn: 'brown' },
      { code: '9043', nameEn: 'coffee bean' },
      { code: '9042', nameEn: 'chestnut' },
      { code: '9041', nameEn: 'copper brown' },
      { code: '506', nameEn: 'dark grey' },
      { code: '517', nameEn: 'medium grey' },
      { code: '501', nameEn: 'light grey' },
      { code: '9020', nameEn: 'light pearl grey' },
      { code: '2923', nameEn: 'goldenrod' },
      { code: '2915', nameEn: 'dusty orange' },
      { code: '2925', nameEn: 'rust' },
      { code: '9025', nameEn: 'hazelnut' },
      { code: '9026', nameEn: 'blush' },
      { code: '9033', nameEn: 'strawberry cream' },
      { code: '3620', nameEn: 'red' },
      { code: '3650', nameEn: 'maroon' },
      { code: '9044', nameEn: 'dark grape' },
      { code: '9046', nameEn: 'wildberry' },
      { code: '9040', nameEn: 'holly berry' },
      { code: '5565', nameEn: 'light maroon' },
      { code: '9024', nameEn: 'dark blush' },
      { code: '3720', nameEn: 'wild rose' },
      { code: '3112', nameEn: 'dusty pink' },
      { code: '9034', nameEn: 'rose petal' },
      { code: '3770', nameEn: 'raspberry rose' },
      { code: '9045', nameEn: 'ruby wine' },
      { code: '3800', nameEn: 'mauve' },
      { code: '4010', nameEn: 'light lavender' },
      { code: '9035', nameEn: 'lavender frost' },
      { code: '4434', nameEn: 'amethyst' },
      { code: '9023', nameEn: 'purple fog' },
      { code: '4400', nameEn: 'dark purple' },
      { code: '9047', nameEn: 'azurite' },
      { code: '5575', nameEn: 'navy blue' },
      { code: '4305', nameEn: 'dark indigo' },
      { code: '6360', nameEn: 'moonlight blue' },
      { code: '6205', nameEn: 'light blue' },
      { code: '9021', nameEn: 'fog' },
      { code: '6309', nameEn: 'jeans blue' },
      { code: '7240', nameEn: 'petrol' },
    ],
  },
  {
    yarnName: 'Baby Merino',
    slug: 'babymerino',
    entries: [
      { code: '01', nameEn: 'white' },
      { code: '02', nameEn: 'off white' },
      { code: '03', nameEn: 'light yellow' },
      { code: '04', nameEn: 'yellow' },
      { code: '05', nameEn: 'light pink' },
      { code: '07', nameEn: 'pink' },
      { code: '08', nameEn: 'cerise' },
      { code: '11', nameEn: 'ice blue' },
      { code: '13', nameEn: 'navy blue' },
      { code: '14', nameEn: 'purple' },
      { code: '16', nameEn: 'red' },
      { code: '24', nameEn: 'light sky blue' },
      { code: '25', nameEn: 'lavender' },
      { code: '26', nameEn: 'light old pink' },
      { code: '27', nameEn: 'old pink' },
      { code: '30', nameEn: 'dark blue' },
      { code: '33', nameEn: 'electric blue' },
      { code: '34', nameEn: 'heather' },
      { code: '36', nameEn: 'electric orange' },
      { code: '41', nameEn: 'plum' },
      { code: '42', nameEn: 'petrol' },
      { code: '44', nameEn: 'powder' },
      { code: '51', nameEn: 'bordeaux' },
      { code: '52', nameEn: 'chocolate' },
      { code: '53', nameEn: 'dew' },
      { code: '54', nameEn: 'powder pink' },
      { code: '55', nameEn: 'peanut' },
      { code: '59', nameEn: 'wheat' },
      { code: '60', nameEn: 'lavender frost' },
      { code: '63', nameEn: 'sand' },
      { code: '64', nameEn: 'light oak' },
      { code: '17', nameEn: 'beige' },
      { code: '19', nameEn: 'grey' },
      { code: '20', nameEn: 'dark grey' },
      { code: '22', nameEn: 'light grey' },
      { code: '23', nameEn: 'light beige' },
      { code: '37', nameEn: 'light lavender' },
      { code: '39', nameEn: 'purple orchid' },
      { code: '40', nameEn: 'amethyst' },
      { code: '48', nameEn: 'blush' },
      { code: '49', nameEn: 'desert rose' },
      { code: '57', nameEn: 'greige' },
      { code: '61', nameEn: 'almond' },
      { code: '62', nameEn: 'medium brown' },
      { code: '101', nameEn: 'berries & cream' },
      { code: '103', nameEn: 'birthday confetti' },
      { code: '104', nameEn: 'dream dust' },
      { code: '105', nameEn: 'magic meringue' },
      { code: '106', nameEn: 'confetti cream' },
    ],
  },
  {
    yarnName: 'Brushed Alpaca Silk',
    slug: 'brushedalpacasilk',
    entries: [
      { code: '01', nameEn: 'off white' },
      { code: '02', nameEn: 'light grey' },
      { code: '03', nameEn: 'grey' },
      { code: '04', nameEn: 'light beige' },
      { code: '05', nameEn: 'beige' },
      { code: '06', nameEn: 'coral' },
      { code: '07', nameEn: 'red' },
      { code: '08', nameEn: 'heather' },
      { code: '12', nameEn: 'powder pink' },
      { code: '13', nameEn: 'denim blue' },
      { code: '14', nameEn: 'morning mist' },
      { code: '15', nameEn: 'light sea green' },
      { code: '17', nameEn: 'light lavender' },
      { code: '18', nameEn: 'cerise' },
      { code: '19', nameEn: 'curry' },
      { code: '20', nameEn: 'pink sand' },
      { code: '22', nameEn: 'pale rust' },
      { code: '23', nameEn: 'bordeaux' },
      { code: '24', nameEn: 'rust' },
      { code: '25', nameEn: 'steel blue' },
      { code: '26', nameEn: 'cobalt blue' },
      { code: '28', nameEn: 'pacific blue' },
      { code: '29', nameEn: 'tangerine' },
      { code: '30', nameEn: 'yellow' },
      { code: '31', nameEn: 'hot pink' },
      { code: '33', nameEn: 'pistachio ice cream' },
      { code: '34', nameEn: 'sweet orchid' },
      { code: '35', nameEn: 'pearl grey' },
      { code: '36', nameEn: 'almond' },
      { code: '37', nameEn: 'sweet apricot' },
      { code: '38', nameEn: 'chocolate' },
      { code: '39', nameEn: 'navy blue' },
      { code: '40', nameEn: 'marzipan' },
      { code: '42', nameEn: 'dark navy' },
      { code: '43', nameEn: 'dark grape' },
      { code: '44', nameEn: 'plum wine' },
    ],
  },
  {
    yarnName: 'Flora',
    slug: 'flora',
    entries: [
      { code: '01', nameEn: 'off white' },
      { code: '02', nameEn: 'white' },
      { code: '03', nameEn: 'light grey' },
      { code: '04', nameEn: 'medium grey' },
      { code: '05', nameEn: 'dark grey' },
      { code: '06', nameEn: 'black' },
      { code: '07', nameEn: 'beige' },
      { code: '08', nameEn: 'brown' },
      { code: '09', nameEn: 'amethyst' },
      { code: '10', nameEn: 'indigo' },
      { code: '11', nameEn: 'petrol' },
      { code: '13', nameEn: 'denim blue' },
      { code: '14', nameEn: 'ice blue' },
      { code: '15', nameEn: 'green' },
      { code: '16', nameEn: 'pistachio' },
      { code: '17', nameEn: 'yellow' },
      { code: '18', nameEn: 'red' },
      { code: '21', nameEn: 'pink' },
      { code: '22', nameEn: 'white fog' },
      { code: '23', nameEn: 'misty forest' },
      { code: '24', nameEn: 'strawberry pink' },
      { code: '25', nameEn: 'caramel' },
      { code: '26', nameEn: 'lemonade' },
      { code: '27', nameEn: 'parrot green' },
      { code: '28', nameEn: 'magenta' },
      { code: '30', nameEn: 'desert rose' },
      { code: '31', nameEn: 'sand' },
      { code: '32', nameEn: 'dark green' },
      { code: '33', nameEn: 'hot red' },
      { code: '34', nameEn: 'light sea green' },
      { code: '35', nameEn: 'midnight shadow' },
      { code: '36', nameEn: 'rose petal' },
      { code: '37', nameEn: 'morning mist' },
      { code: '38', nameEn: 'dark navy' },
      { code: '39', nameEn: 'marzipan' },
    ],
  },
  {
    yarnName: 'Karisma',
    slug: 'karisma',
    entries: [
      { code: '19', nameEn: 'white' },
      { code: '01', nameEn: 'off white' },
      { code: '85', nameEn: 'light beige' },
      { code: '77', nameEn: 'light oak' },
      { code: '55', nameEn: 'light beige brown' },
      { code: '54', nameEn: 'beige brown' },
      { code: '91', nameEn: 'almond' },
      { code: '92', nameEn: 'cocoa bean' },
      { code: '04', nameEn: 'chocolate brown' },
      { code: '56', nameEn: 'dark brown' },
      { code: '53', nameEn: 'anthracite' },
      { code: '16', nameEn: 'dark grey' },
      { code: '21', nameEn: 'medium grey' },
      { code: '44', nameEn: 'light grey' },
      { code: '72', nameEn: 'light pearl grey' },
      { code: '79', nameEn: 'lemon' },
      { code: '52', nameEn: 'dark mustard' },
      { code: '11', nameEn: 'orange' },
      { code: '18', nameEn: 'red' },
      { code: '48', nameEn: 'wine red' },
      { code: '81', nameEn: 'old rose' },
      { code: '80', nameEn: 'rose' },
      { code: '84', nameEn: 'desert rose' },
      { code: '71', nameEn: 'silver pink' },
      { code: '66', nameEn: 'light dusty pink' },
      { code: '33', nameEn: 'medium pink' },
      { code: '40', nameEn: 'light old pink' },
      { code: '13', nameEn: 'cerise' },
      { code: '39', nameEn: 'dark old rose' },
      { code: '76', nameEn: 'dark purple' },
      { code: '74', nameEn: 'lavender' },
      { code: '75', nameEn: 'petrol cerise' },
      { code: '17', nameEn: 'navy blue' },
      { code: '37', nameEn: 'dark grey blue' },
      { code: '65', nameEn: 'denim blue' },
      { code: '07', nameEn: 'bright blue' },
      { code: '30', nameEn: 'light denim blue' },
      { code: '68', nameEn: 'light sky blue' },
      { code: '90', nameEn: 'fog' },
      { code: '89', nameEn: 'morning mist' },
      { code: '69', nameEn: 'light grey green' },
      { code: '60', nameEn: 'blue turquoise' },
      { code: '73', nameEn: 'petrol' },
      { code: '50', nameEn: 'sea green' },
      { code: '88', nameEn: 'sage green' },
      { code: '86', nameEn: 'laurel green' },
      { code: '45', nameEn: 'light olive' },
      { code: '47', nameEn: 'forest green' },
      { code: '87', nameEn: 'moss green' },
    ],
  },
  {
    yarnName: 'Merino Extra Fine',
    slug: 'merinoextrafine',
    entries: [
      { code: '01', nameEn: 'off white' },
      { code: '50', nameEn: 'light beige' },
      { code: '08', nameEn: 'greige' },
      { code: '07', nameEn: 'light taupe' },
      { code: '06', nameEn: 'taupe' },
      { code: '51', nameEn: 'double latte' },
      { code: '49', nameEn: 'chocolate' },
      { code: '09', nameEn: 'dark brown' },
      { code: '03', nameEn: 'dark grey' },
      { code: '04', nameEn: 'medium grey' },
      { code: '05', nameEn: 'light grey' },
      { code: '54', nameEn: 'morning fog' },
      { code: '24', nameEn: 'light yellow' },
      { code: '30', nameEn: 'mustard' },
      { code: '11', nameEn: 'crimson red' },
      { code: '48', nameEn: 'bordeaux' },
      { code: '42', nameEn: 'cedar' },
      { code: '45', nameEn: 'blush' },
      { code: '46', nameEn: 'desert rose' },
      { code: '40', nameEn: 'powder pink' },
      { code: '25', nameEn: 'pink' },
      { code: '32', nameEn: 'dark rose' },
      { code: '35', nameEn: 'dark heather' },
      { code: '34', nameEn: 'heather' },
      { code: '16', nameEn: 'light pink' },
      { code: '36', nameEn: 'amethyst' },
      { code: '22', nameEn: 'medium purple' },
      { code: '44', nameEn: 'royal purple' },
      { code: '13', nameEn: 'storm blue' },
      { code: '27', nameEn: 'navy blue' },
      { code: '56', nameEn: 'dark navy' },
      { code: '55', nameEn: 'midnight shadow' },
      { code: '20', nameEn: 'dark blue' },
      { code: '23', nameEn: 'spray blue' },
      { code: '19', nameEn: 'dream blue' },
      { code: '38', nameEn: 'blue fog' },
      { code: '39', nameEn: 'ice blue' },
      { code: '43', nameEn: 'light turquoise' },
      { code: '29', nameEn: 'turquoise' },
      { code: '28', nameEn: 'north sea' },
      { code: '37', nameEn: 'misty forest' },
      { code: '15', nameEn: 'light sea green' },
    ],
  },
  {
    yarnName: 'Safran',
    slug: 'safran',
    entries: [
      { code: '17', nameEn: 'white' },
      { code: '72', nameEn: 'chalk' },
      { code: '18', nameEn: 'off white' },
      { code: '71', nameEn: 'marzipan' },
      { code: '64', nameEn: 'light beige' },
      { code: '21', nameEn: 'peanut' },
      { code: '22', nameEn: 'almond' },
      { code: '68', nameEn: 'coffee' },
      { code: '23', nameEn: 'deep taupe' },
      { code: '07', nameEn: 'grey' },
      { code: '10', nameEn: 'vanilla cream' },
      { code: '11', nameEn: 'sunshine' },
      { code: '62', nameEn: 'lemon' },
      { code: '66', nameEn: 'mustard' },
      { code: '67', nameEn: 'pumpkin' },
      { code: '28', nameEn: 'orange' },
      { code: '59', nameEn: 'red clay' },
      { code: '20', nameEn: 'cherry' },
      { code: '19', nameEn: 'red' },
      { code: '13', nameEn: 'raspberry' },
      { code: '12', nameEn: 'peach' },
      { code: '02', nameEn: 'pink' },
      { code: '01', nameEn: 'desert rose' },
      { code: '77', nameEn: 'light rose' },
      { code: '56', nameEn: 'powder pink' },
      { code: '57', nameEn: 'mauve' },
      { code: '75', nameEn: 'magenta' },
      { code: '15', nameEn: 'plum' },
      { code: '58', nameEn: 'amethyst' },
      { code: '70', nameEn: 'sweet orchid' },
      { code: '05', nameEn: 'lavender' },
      { code: '76', nameEn: 'powder blue' },
      { code: '06', nameEn: 'denim blue' },
      { code: '09', nameEn: 'navy blue' },
      { code: '73', nameEn: 'cobalt blue' },
      { code: '51', nameEn: 'petrol' },
      { code: '30', nameEn: 'turquoise' },
      { code: '50', nameEn: 'mint' },
      { code: '74', nameEn: 'pistachio ice cream' },
      { code: '63', nameEn: 'sea green' },
      { code: '04', nameEn: 'sage green' },
      { code: '78', nameEn: 'forest green' },
      { code: '60', nameEn: 'moss green' },
      { code: '65', nameEn: 'pistachio' },
      { code: '31', nameEn: 'apple green' },
      { code: '61', nameEn: 'green tea' },
      { code: '16', nameEn: 'black' },
    ],
  },
]

// ── Filter ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function readArg(name) {
  const prefix = `${name}=`
  for (const a of args) if (a.startsWith(prefix)) return a.slice(prefix.length)
  return null
}
const yarnFilter = readArg('--yarn')
const yarns = yarnFilter
  ? DROPS_YARNS.filter((y) => y.yarnName.toLowerCase() === yarnFilter.toLowerCase())
  : DROPS_YARNS
if (yarns.length === 0) {
  console.error(`Ingen garn matcher --yarn=${yarnFilter}`)
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toHex(n) {
  return n.toString(16).padStart(2, '0').toUpperCase()
}

async function downloadSwatch(slug, code, cacheDir) {
  const cachePath = resolve(cacheDir, `${code}.jpg`)
  if (existsSync(cachePath)) return cachePath
  const url = `https://images.garnstudio.com/img/shademap/${slug}/${code}.jpg`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'manual',
  })
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Redirect (sandsynligvis 404) for ${url}`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(cachePath, buf)
  return cachePath
}

async function sampleHex(path) {
  const img = await Jimp.read(path)
  const cx = Math.floor(img.bitmap.width / 2)
  const cy = Math.floor(img.bitmap.height / 2)
  let r = 0, g = 0, b = 0, n = 0
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const px = img.getPixelColor(cx + dx, cy + dy)
      r += (px >>> 24) & 0xff
      g += (px >>> 16) & 0xff
      b += (px >>> 8) & 0xff
      n++
    }
  }
  return `#${toHex(Math.round(r / n))}${toHex(Math.round(g / n))}${toHex(Math.round(b / n))}`
}

function fileSlug(yarnName) {
  return 'drops-' + yarnName.toLowerCase().replace(/\s+/g, '-')
}

function constName(yarnName) {
  return 'DROPS_' + yarnName.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_') + '_SEED'
}

function capitalize(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

async function writeSeedFile(yarn, sampled) {
  const outPath = resolve(here, '..', 'lib', 'data', 'colorSeeds', `${fileSlug(yarn.yarnName)}.mjs`)
  const lines = []
  lines.push(`// Hex-seed for DROPS ${yarn.yarnName}.`)
  lines.push(`// Hex-koder er sampled fra centrum-pixel af garnstudio.com's farve-swatches`)
  lines.push(`// (lille JPG pr. farve). Koden matches 1:1 mod colors.color_number.`)
  lines.push(`// Kilde: https://www.garnstudio.com/yarn.php?show=drops-${yarn.yarnName.toLowerCase().replace(/\s+/g, '-')}`)
  lines.push(`// Sampled: 2026-05-02 — se scripts/sample-drops-colors.mjs.`)
  lines.push(``)
  lines.push(`/** @type {import('../../catalog/colorSeed.mjs').ColorSeed} */`)
  lines.push(`export const ${constName(yarn.yarnName)} = {`)
  lines.push(`  producer: 'Drops',`)
  lines.push(`  yarnName: '${yarn.yarnName}',`)
  lines.push(`  series: null,`)
  lines.push(`  matchKey: 'color_number',`)
  lines.push(`  entries: [`)
  for (const e of sampled) {
    const name = capitalize(e.nameEn)
    if (e.hex == null) {
      lines.push(`    { key: '${e.code}', hex: null, colorNameDa: '${name.replace(/'/g, "\\'")}' },`)
    } else {
      lines.push(`    { key: '${e.code}', hex: '${e.hex}', colorNameDa: '${name.replace(/'/g, "\\'")}' },`)
    }
  }
  lines.push(`  ],`)
  lines.push(`}`)
  lines.push(``)
  await writeFile(outPath, lines.join('\n'), 'utf8')
  return outPath
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function processYarn(yarn) {
  const cacheDir = resolve(cacheRoot, `drops-${yarn.slug}-swatches`)
  await mkdir(cacheDir, { recursive: true })
  const sampled = []
  let ok = 0, fail = 0
  for (const { code, nameEn } of yarn.entries) {
    try {
      const path = await downloadSwatch(yarn.slug, code, cacheDir)
      const hex = await sampleHex(path)
      sampled.push({ code, nameEn, hex })
      ok++
    } catch (err) {
      console.error(`  [${yarn.yarnName}] ${code}  FAIL: ${err.message}`)
      sampled.push({ code, nameEn, hex: null })
      fail++
    }
  }
  const out = await writeSeedFile(yarn, sampled)
  console.log(`✓ ${yarn.yarnName}: ${ok} sampled, ${fail} fejlet  →  ${out}`)
  return { yarn, ok, fail }
}

let totalOk = 0, totalFail = 0
for (const y of yarns) {
  const r = await processYarn(y)
  totalOk += r.ok; totalFail += r.fail
}
console.log(`\n=== Færdig ===  total: ${totalOk} sampled, ${totalFail} fejlet`)
