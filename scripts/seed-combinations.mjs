#!/usr/bin/env node
/**
 * Seeder kuraterede yarn_combinations til Supabase.
 *
 * Brug:
 *   node scripts/seed-combinations.mjs           # kør import
 *   node scripts/seed-combinations.mjs --dry     # vis hvad der ville ske, uden at skrive
 *
 * Kræver at de involverede garner allerede findes i kataloget (kør npm run import:yarns først).
 * Combos defineres som natural keys (producer/name/series) → script slår op til UUIDs og
 * canonicalize'r par-rækkefølgen (a <= b) så samme par ikke kan dubleres.
 */
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'

loadEnv()
const supabase = makeAdminClient()
const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run')

/**
 * Klassiske held-together combos til pind 5-6.
 * Specs er kuraterede tommelfingerregler — endelig strikkefasthed afhænger af opskrift og strikker.
 */
const COMBOS = [
  {
    a: { producer: 'Sandnes Garn', name: 'Tynn Merinoull', series: null },
    b: { producer: 'Sandnes Garn', name: 'Tynn Silk Mohair', series: null },
    combined_needle_min_mm: 5,
    combined_needle_max_mm: 6,
    combined_gauge_stitches_10cm: 18,
    combined_thickness_category: 'aran',
    use_cases: ['sweatre', 'cardigans', 'lette overdele'],
    notes: 'Klassisk skandinavisk pind 6-kombi. Merinoull giver struktur, silk mohair giver blød halo og varme. Tåler lun håndvask.',
  },
  {
    a: { producer: 'Drops', name: 'Kid-Silk', series: null },
    b: { producer: 'Drops', name: 'Alpaca', series: null },
    combined_needle_min_mm: 4.5,
    combined_needle_max_mm: 6,
    combined_gauge_stitches_10cm: 19,
    combined_thickness_category: 'aran',
    use_cases: ['lette sweatre', 'cardigans', 'oversize'],
    notes: 'Mohair-halo + alpakaens fald. Letvægts-strik der stadig holder formen. Begge garner tåler kun håndvask.',
  },
  {
    a: { producer: 'Drops', name: 'Flora', series: null },
    b: { producer: 'Drops', name: 'Flora', series: null },
    combined_needle_min_mm: 4,
    combined_needle_max_mm: 5,
    combined_gauge_stitches_10cm: 22,
    combined_thickness_category: 'dk',
    use_cases: ['hverdagssweatre', 'huer', 'colorwork'],
    notes: '2× fingering uld/alpaka holdt sammen giver fast og varm strik med god slidstyrke.',
  },
  {
    a: { producer: 'Filcolana', name: 'Peruvian', series: 'Highland Wool' },
    b: { producer: 'Filcolana', name: 'Peruvian', series: 'Highland Wool' },
    combined_needle_min_mm: 4.5,
    combined_needle_max_mm: 5,
    combined_gauge_stitches_10cm: 21,
    combined_thickness_category: 'aran',
    use_cases: ['sweatre', 'cardigans', 'huer'],
    notes: '2× ren peruviansk highland-uld giver klassisk nordisk pind 5-strik med god varme.',
  },
]

async function findYarnId({ producer, name, series }) {
  let q = supabase.from('yarns').select('id').eq('producer', producer).eq('name', name)
  q = series ? q.eq('series', series) : q.is('series', null)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data?.id ?? null
}

function fmt(y) {
  return `${y.producer} / ${y.name}${y.series ? ' / ' + y.series : ''}`
}

async function run() {
  if (DRY) console.log('** DRY RUN — ingen ændringer skrives **\n')

  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const c of COMBOS) {
    const label = `${fmt(c.a)}  +  ${fmt(c.b)}`
    try {
      const idA = await findYarnId(c.a)
      const idB = await findYarnId(c.b)
      if (!idA || !idB) {
        const missing = [!idA && fmt(c.a), !idB && fmt(c.b)].filter(Boolean).join(' og ')
        console.error(`✗ ${label}: kan ikke finde ${missing} i kataloget`)
        failed++
        continue
      }

      // Canonical ordering: yarn_id_a <= yarn_id_b
      const [yarnA, yarnB] = idA <= idB ? [idA, idB] : [idB, idA]

      // Tjek om combo'en allerede findes
      const { data: existing } = await supabase
        .from('yarn_combinations')
        .select('id')
        .eq('yarn_id_a', yarnA)
        .eq('yarn_id_b', yarnB)
        .maybeSingle()

      if (existing) {
        console.log(`= ${label}  [findes allerede, springes over]`)
        skipped++
        continue
      }

      const payload = {
        yarn_id_a: yarnA,
        yarn_id_b: yarnB,
        combined_needle_min_mm: c.combined_needle_min_mm,
        combined_needle_max_mm: c.combined_needle_max_mm,
        combined_gauge_stitches_10cm: c.combined_gauge_stitches_10cm,
        combined_thickness_category: c.combined_thickness_category,
        use_cases: c.use_cases,
        notes: c.notes,
      }

      if (DRY) {
        console.log(`+ ${label}  [ville INDSÆTTE: pind ${c.combined_needle_min_mm}-${c.combined_needle_max_mm}]`)
      } else {
        const { error } = await supabase.from('yarn_combinations').insert(payload)
        if (error) throw error
        console.log(`✓ ${label}  [INDSAT: pind ${c.combined_needle_min_mm}-${c.combined_needle_max_mm}]`)
      }
      inserted++
    } catch (e) {
      console.error(`✗ ${label}: ${e.message}`)
      failed++
    }
  }

  console.log(`\nCombos: indsat ${inserted}, sprunget over ${skipped}, fejl ${failed}`)
}

run().catch((e) => { console.error(e); process.exit(1) })
