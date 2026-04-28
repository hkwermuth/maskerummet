#!/usr/bin/env node
/**
 * Importerer/bagudfylder hex_code i public.colors fra producent-seeds i
 * lib/data/colorSeeds/. Cascade-opdaterer yarn_items.hex_color hvor NULL.
 *
 * Brug:
 *   npm run seed:colors                       # kør alle seeds
 *   npm run seed:colors -- --dry              # vis hvad der ville ske
 *   npm run seed:colors -- --report           # CSV med manglende hex til stdout
 *   npm run seed:colors -- --producer=Permin  # filter
 *   npm run seed:colors -- --yarn=Bella       # filter (matcher yarnName)
 *   npm run seed:colors -- --force            # overskriv eksisterende hex der afviger fra seed
 *
 * Bemærk:
 *   Kræver SUPABASE_SERVICE_ROLE_KEY i .env.local — bruges aldrig i klient-bundle.
 *   Idempotent: 2. kørsel uden seed-ændringer skriver 0 rækker.
 *   Manuel hex_color i yarn_items er beskyttet (NULL-guard, ingen --force-cascade).
 */
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'
import { ALL_COLOR_SEEDS } from '../lib/data/colorSeeds/index.mjs'
import { mapColorSeedToColorRows, summarizeDiff } from '../lib/catalog/colorSeed.mjs'

loadEnv()
const supabase = makeAdminClient()

const args = process.argv.slice(2)
const DRY = args.includes('--dry') || args.includes('--dry-run')
const REPORT = args.includes('--report')
const FORCE = args.includes('--force')
const producerFilter = readArg('--producer')
const yarnFilter = readArg('--yarn')

function readArg(name) {
  const prefix = `${name}=`
  for (const a of args) if (a.startsWith(prefix)) return a.slice(prefix.length)
  return null
}

async function findYarnId(seed) {
  let q = supabase.from('yarns').select('id').eq('producer', seed.producer).eq('name', seed.yarnName)
  q = seed.series == null ? q.is('series', null) : q.eq('series', seed.series)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data?.id ?? null
}

async function fetchColorsForYarn(yarnId) {
  const { data, error } = await supabase
    .from('colors')
    .select('id,yarn_id,color_number,hex_code')
    .eq('yarn_id', yarnId)
  if (error) throw error
  return data ?? []
}

async function applyColorUpdates(updates) {
  let written = 0
  for (const u of updates) {
    if (DRY) { written += 1; continue }
    const { error } = await supabase.from('colors').update({ hex_code: u.hex }).eq('id', u.id)
    if (error) throw error
    written += 1
  }
  return written
}

async function cascadeYarnItems(updates) {
  // Pr. opdateret farve: sæt yarn_items.hex_color = den nye hex hvor item er linket
  // til farven og enten har NULL eller tom hex_color (manuel hex altid vinder).
  let written = 0
  for (const u of updates) {
    if (DRY) {
      const { count, error } = await supabase
        .from('yarn_items')
        .select('id', { count: 'exact', head: true })
        .eq('catalog_color_id', u.id)
        .or('hex_color.is.null,hex_color.eq.')
      if (error) throw error
      written += count ?? 0
      continue
    }
    const { data, error } = await supabase
      .from('yarn_items')
      .update({ hex_color: u.hex })
      .eq('catalog_color_id', u.id)
      .or('hex_color.is.null,hex_color.eq.')
      .select('id')
    if (error) throw error
    written += (data ?? []).length
  }
  return written
}

function filterSeeds(seeds) {
  return seeds.filter((s) => {
    if (producerFilter && s.producer.toLowerCase() !== producerFilter.toLowerCase()) return false
    if (yarnFilter && s.yarnName.toLowerCase() !== yarnFilter.toLowerCase()) return false
    return true
  })
}

function emitReport(rows) {
  // Simpel CSV til stdout. Brug ; som separator for at undgå komma-i-farvenavn-problemer.
  console.log('producer;yarn;series;color_number;color_name;reason')
  for (const r of rows) {
    const safe = (v) => (v == null ? '' : String(v).replaceAll(';', ','))
    console.log([
      safe(r.producer),
      safe(r.yarn),
      safe(r.series),
      safe(r.colorNumber),
      safe(r.colorName),
      safe(r.reason),
    ].join(';'))
  }
}

async function main() {
  const seeds = filterSeeds(ALL_COLOR_SEEDS)
  if (seeds.length === 0) {
    console.error('Ingen seeds matcher filterne. ALL_COLOR_SEEDS:',
      ALL_COLOR_SEEDS.map((s) => `${s.producer}/${s.yarnName}`).join(', '))
    process.exit(1)
  }

  let totalColorUpdates = 0
  let totalCascadeUpdates = 0
  let totalConflicts = 0
  const reportRows = []

  for (const seed of seeds) {
    const yarnId = await findYarnId(seed)
    if (!yarnId) {
      console.warn(`! Yarn ikke fundet for ${seed.producer}/${seed.yarnName}/${seed.series ?? '∅'} — springer over`)
      continue
    }
    const dbColors = await fetchColorsForYarn(yarnId)
    const diff = mapColorSeedToColorRows(seed, dbColors, { force: FORCE })
    const summary = summarizeDiff(seed, diff)

    console.log(
      `\n${summary.label}: opdater=${summary.toUpdate} uændret=${summary.unchanged} konflikt=${summary.conflicts} unmatched-seeds=${summary.unmatchedSeeds} mangler-hex=${summary.missingHex} ukendt-i-DB=${summary.uncoveredDbRows}${DRY ? ' [DRY]' : ''}`,
    )

    if (diff.conflicts.length > 0) {
      totalConflicts += diff.conflicts.length
      for (const c of diff.conflicts) {
        console.log(`  ! konflikt id=${c.id}: DB=${c.existing} seed=${c.seed}${FORCE ? ' (force=true → overskrives)' : ' (skipped — kør med --force for at overskrive)'}`)
      }
    }

    const colorWritten = await applyColorUpdates(diff.updates)
    const cascadeWritten = await cascadeYarnItems(diff.updates)
    totalColorUpdates += colorWritten
    totalCascadeUpdates += cascadeWritten

    if (REPORT) {
      for (const e of diff.missing) {
        reportRows.push({
          producer: seed.producer, yarn: seed.yarnName, series: seed.series,
          colorNumber: e.key, colorName: e.colorNameDa, reason: 'missing-hex-in-seed',
        })
      }
      for (const e of diff.unmatched) {
        reportRows.push({
          producer: seed.producer, yarn: seed.yarnName, series: seed.series,
          colorNumber: e.key, colorName: e.colorNameDa, reason: 'no-db-row-for-seed-key',
        })
      }
      for (const r of diff.uncovered) {
        reportRows.push({
          producer: seed.producer, yarn: seed.yarnName, series: seed.series,
          colorNumber: r.color_number, colorName: '', reason: 'db-row-not-in-seed',
        })
      }
    }
  }

  console.log(`\n=== Total ===`)
  console.log(`colors.hex_code opdateret: ${totalColorUpdates}${DRY ? ' (dry)' : ''}`)
  console.log(`yarn_items.hex_color cascade: ${totalCascadeUpdates}${DRY ? ' (dry)' : ''}`)
  if (totalConflicts > 0) console.log(`konflikter: ${totalConflicts}${FORCE ? ' (overskrevet)' : ' (skipped)'}`)

  if (REPORT) {
    console.log('\n=== Report ===')
    emitReport(reportRows)
  }
}

main().catch((err) => {
  console.error('seed-colors fejlede:', err.message ?? err)
  process.exit(1)
})
