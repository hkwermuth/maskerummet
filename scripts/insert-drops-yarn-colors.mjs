/**
 * Indsætter farve-rækker i public.colors for de 9 nye Drops-garner ud fra
 * seeds i lib/data/colorSeeds/. Idempotent — springer eksisterende
 * (yarn_id, color_number) over.
 *
 * Kører:
 *   node scripts/insert-drops-yarn-colors.mjs --dry          # vis hvad der ville ske
 *   node scripts/insert-drops-yarn-colors.mjs                # rigtig insert
 *   node scripts/insert-drops-yarn-colors.mjs --yarn=Air     # filter på et garn
 */
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'
import { DROPS_AIR_SEED } from '../lib/data/colorSeeds/drops-air.mjs'
import { DROPS_ALASKA_SEED } from '../lib/data/colorSeeds/drops-alaska.mjs'
import { DROPS_ALPACA_SEED } from '../lib/data/colorSeeds/drops-alpaca.mjs'
import { DROPS_BABY_MERINO_SEED } from '../lib/data/colorSeeds/drops-baby-merino.mjs'
import { DROPS_BRUSHED_ALPACA_SILK_SEED } from '../lib/data/colorSeeds/drops-brushed-alpaca-silk.mjs'
import { DROPS_FLORA_SEED } from '../lib/data/colorSeeds/drops-flora.mjs'
import { DROPS_KARISMA_SEED } from '../lib/data/colorSeeds/drops-karisma.mjs'
import { DROPS_MERINO_EXTRA_FINE_SEED } from '../lib/data/colorSeeds/drops-merino-extra-fine.mjs'
import { DROPS_SAFRAN_SEED } from '../lib/data/colorSeeds/drops-safran.mjs'

// shademap-slug pr. garn — bruges til image_url. Drops bruger forskellige slugs
// til shademap end til yarn-side; matchet manuelt mod garnstudio.com 2026-05-02.
const SLUG_BY_YARN = {
  Air: 'air',
  Alaska: 'alaska',
  Alpaca: 'alpaca',
  'Baby Merino': 'babymerino',
  'Brushed Alpaca Silk': 'brushedalpacasilk',
  Flora: 'flora',
  Karisma: 'karisma',
  'Merino Extra Fine': 'merinoextrafine',
  Safran: 'safran',
}

const SEEDS = [
  DROPS_AIR_SEED, DROPS_ALASKA_SEED, DROPS_ALPACA_SEED,
  DROPS_BABY_MERINO_SEED, DROPS_BRUSHED_ALPACA_SILK_SEED, DROPS_FLORA_SEED,
  DROPS_KARISMA_SEED, DROPS_MERINO_EXTRA_FINE_SEED, DROPS_SAFRAN_SEED,
]

loadEnv()
const supabase = makeAdminClient()

const args = process.argv.slice(2)
const DRY = args.includes('--dry') || args.includes('--dry-run')
const yarnFilter = (() => {
  for (const a of args) if (a.startsWith('--yarn=')) return a.slice(7)
  return null
})()

const filteredSeeds = yarnFilter
  ? SEEDS.filter((s) => s.yarnName.toLowerCase() === yarnFilter.toLowerCase())
  : SEEDS

if (filteredSeeds.length === 0) {
  console.error(`Ingen seed matcher --yarn=${yarnFilter}`)
  process.exit(1)
}

let totalInsert = 0
let totalSkip = 0
let totalMissingYarn = 0

for (const seed of filteredSeeds) {
  const slug = SLUG_BY_YARN[seed.yarnName]
  if (!slug) {
    console.warn(`! Ingen shademap-slug for ${seed.yarnName} — image_url sættes til null`)
  }

  const { data: yarn, error: yErr } = await supabase
    .from('yarns').select('id')
    .eq('producer', seed.producer)
    .eq('name', seed.yarnName)
    .is('series', null)
    .maybeSingle()
  if (yErr) { console.error(`Fejl: ${seed.yarnName}:`, yErr); process.exit(1) }
  if (!yarn) {
    console.warn(`! Yarn ikke fundet i DB: ${seed.producer}/${seed.yarnName} — springer over`)
    totalMissingYarn++
    continue
  }

  const { data: existing } = await supabase
    .from('colors').select('color_number').eq('yarn_id', yarn.id)
  const existingSet = new Set((existing ?? []).map((r) => r.color_number))

  const toInsert = []
  let skipped = 0
  for (const e of seed.entries) {
    if (existingSet.has(e.key)) { skipped++; continue }
    toInsert.push({
      yarn_id: yarn.id,
      color_number: e.key,
      color_name: e.colorNameDa,
      hex_code: e.hex,
      image_url: slug ? `https://images.garnstudio.com/img/shademap/${slug}/${e.key}.jpg` : null,
      status: 'aktiv',
      color_family: null,
    })
  }

  console.log(`\n${seed.producer} ${seed.yarnName}:`)
  console.log(`  yarn_id: ${yarn.id}`)
  console.log(`  i DB: ${existingSet.size}, vil indsætte: ${toInsert.length}, springer over: ${skipped}${DRY ? ' [DRY]' : ''}`)

  if (toInsert.length > 0) {
    if (DRY) {
      console.log(`  Eksempler (første 3):`)
      for (const r of toInsert.slice(0, 3)) {
        console.log(`    ${r.color_number}  ${r.hex_code}  ${r.color_name}`)
      }
    } else {
      const { error: iErr } = await supabase.from('colors').insert(toInsert)
      if (iErr) { console.error(`  Insert fejlede:`, iErr); process.exit(1) }
      console.log(`  ✓ Indsatte ${toInsert.length} farver`)
    }
  }

  totalInsert += toInsert.length
  totalSkip += skipped
}

console.log(`\n=== Total ===`)
console.log(`vil indsætte: ${totalInsert}${DRY ? ' [DRY]' : ' (indsat)'}`)
console.log(`sprunget over (eksisterer): ${totalSkip}`)
if (totalMissingYarn > 0) console.log(`manglende yarn-rækker i DB: ${totalMissingYarn}`)

// Trigger revalidate efter insert
if (!DRY && totalInsert > 0) {
  const site = process.env.NEXT_PUBLIC_SITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (site && secret) {
    try {
      const res = await fetch(`${site}/api/revalidate?secret=${secret}&path=/garn`, { method: 'POST' })
      console.log(`Revalidate /garn: ${res.status}`)
    } catch (e) { console.warn('Revalidate fejlede:', e.message) }
  }
}
