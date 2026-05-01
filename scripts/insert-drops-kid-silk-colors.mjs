/**
 * Engangs-script: opretter de 71 farve-rækker for Drops Kid-Silk i public.colors.
 * Bruger hex-koder + navne fra DROPS_KID_SILK_SEED. Idempotent — springer
 * eksisterende color_number for samme yarn over.
 *
 * Kører: node scripts/insert-drops-kid-silk-colors.mjs [--dry]
 */
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'
import { DROPS_KID_SILK_SEED } from '../lib/data/colorSeeds/drops-kid-silk.mjs'

loadEnv()
const supabase = makeAdminClient()
const DRY = process.argv.includes('--dry')

const { data: yarn, error: yErr } = await supabase
  .from('yarns').select('id')
  .eq('producer', DROPS_KID_SILK_SEED.producer)
  .eq('name', DROPS_KID_SILK_SEED.yarnName)
  .is('series', null)
  .maybeSingle()
if (yErr) { console.error(yErr); process.exit(1) }
if (!yarn) { console.error(`Yarn ikke fundet: ${DROPS_KID_SILK_SEED.producer} / ${DROPS_KID_SILK_SEED.yarnName}`); process.exit(1) }

const yarnId = yarn.id
console.log(`Drops Kid-Silk yarn id: ${yarnId}`)

const { data: existing } = await supabase
  .from('colors').select('color_number').eq('yarn_id', yarnId)
const existingSet = new Set((existing ?? []).map((r) => r.color_number))
console.log(`Eksisterende farver i DB: ${existingSet.size}`)

const toInsert = []
let skipped = 0
for (const e of DROPS_KID_SILK_SEED.entries) {
  if (existingSet.has(e.key)) { skipped++; continue }
  toInsert.push({
    yarn_id: yarnId,
    color_number: e.key,
    color_name: e.colorNameDa,
    hex_code: e.hex,
    image_url: `https://images.garnstudio.com/img/shademap/kid-silk/${e.key}.jpg`,
    status: 'aktiv',
    color_family: null,
  })
}

console.log(`Skal indsætte: ${toInsert.length}, skippet (eksisterer): ${skipped}`)
if (DRY) {
  console.log('** DRY — ingen ændringer skrives **')
  console.log(toInsert.slice(0, 3))
  process.exit(0)
}

if (toInsert.length === 0) {
  console.log('Intet at gøre.')
  process.exit(0)
}

// Insert i batches af 100 (her: ét batch)
const { error: iErr } = await supabase.from('colors').insert(toInsert)
if (iErr) { console.error('Insert fejlede:', iErr); process.exit(1) }
console.log(`✓ Indsatte ${toInsert.length} Kid-Silk farver`)

// Trigger revalidate
const site = process.env.NEXT_PUBLIC_SITE_URL
const secret = process.env.REVALIDATE_SECRET
if (site && secret) {
  try {
    const res = await fetch(`${site}/api/revalidate?secret=${secret}&path=/garn`, { method: 'POST' })
    console.log(`Revalidate: ${res.status}`)
  } catch (e) { console.warn('Revalidate fejlede:', e.message) }
}
