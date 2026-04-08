#!/usr/bin/env node
/**
 * Importerer prosabeskrivelser fra content/descriptions.md til Supabase yarns.description.
 *
 * Krav: SUPABASE_SERVICE_ROLE_KEY og NEXT_PUBLIC_SUPABASE_URL i .env.local (eller miljø).
 *
 * Kør: npm run import:descriptions
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

// Load .env.local manuelt (ingen dotenv-dep)
const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
try {
  const env = readFileSync(resolve(root, '.env.local'), 'utf8')
  for (const rawLine of env.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
} catch { /* ignore */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Diagnostik: vis hvilken type nøgle vi bruger (uden at lække den)
const keyType = SERVICE_KEY.startsWith('sb_secret_') ? 'sb_secret (ny)'
  : SERVICE_KEY.startsWith('eyJ') ? 'JWT service_role'
  : 'ukendt format'
console.log(`Bruger nøgle: ${keyType}, længde ${SERVICE_KEY.length}`)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Danske nøgler → DB-kolonne
const META_KEYS = {
  'velegnet til': 'use_cases',
  'certificeringer': 'certifications',
  'sæson': 'seasonal_suitability',
  'saeson': 'seasonal_suitability',
}

// Parse markdown til [{producer, name, series, description, meta}]
// meta = { use_cases?: string[], certifications?: string[], seasonal_suitability?: string[] }
function parse(md) {
  const entries = []
  const lines = md.split('\n')
  let cur = null
  let phase = 'body' // 'meta' lige efter en header, 'body' efter første blank linje
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/)
    if (h) {
      if (cur) entries.push(finalize(cur))
      const parts = h[1].split('|').map((s) => s.trim()).filter(Boolean)
      if (parts.length < 2) { cur = null; continue }
      cur = {
        producer: parts[0],
        name: parts[1],
        series: parts[2] ?? null,
        body: [],
        meta: {},
      }
      phase = 'meta'
      continue
    }
    if (!cur) continue

    if (phase === 'meta') {
      // Tom linje afslutter metadata-blokken
      if (line.trim() === '') { phase = 'body'; continue }
      // Prøv at matche nøgle: værdi
      const kv = line.match(/^([^:]+):\s*(.*)$/)
      if (kv) {
        const key = kv[1].trim().toLowerCase()
        const dbCol = META_KEYS[key]
        if (dbCol) {
          const values = kv[2].split(',').map((s) => s.trim()).filter(Boolean)
          cur.meta[dbCol] = values
          continue
        }
      }
      // Ikke en meta-linje → fald igennem til body
      phase = 'body'
      cur.body.push(line)
    } else {
      cur.body.push(line)
    }
  }
  if (cur) entries.push(finalize(cur))
  return entries
}

function finalize(e) {
  return {
    producer: e.producer,
    name: e.name,
    series: e.series,
    description: e.body.join('\n').trim(),
    meta: e.meta,
  }
}

function sqlEscape(v) {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) {
    return `array[${v.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(', ')}]::text[]`
  }
  return `'${String(v).replace(/'/g, "''")}'`
}

function buildSql(entries) {
  const lines = [
    '-- Auto-genereret af scripts/import-descriptions.mjs',
    '-- Indsæt i Supabase SQL Editor og kør.',
    '',
    'begin;',
    '',
  ]
  for (const e of entries) {
    const sets = []
    if (e.description.length > 0) sets.push(`description = ${sqlEscape(e.description)}`)
    for (const [col, val] of Object.entries(e.meta)) sets.push(`${col} = ${sqlEscape(val)}`)
    if (sets.length === 0) continue
    const where = [
      `producer = ${sqlEscape(e.producer)}`,
      `name = ${sqlEscape(e.name)}`,
      e.series ? `series = ${sqlEscape(e.series)}` : `series is null`,
    ].join(' and ')
    lines.push(`-- ${e.producer} / ${e.name}${e.series ? ' / '+e.series : ''}`)
    lines.push(`update yarns set`)
    lines.push('  ' + sets.join(',\n  '))
    lines.push(`where ${where};`)
    lines.push('')
  }
  lines.push('commit;')
  return lines.join('\n')
}

async function run() {
  const md = readFileSync(resolve(root, 'content/descriptions.md'), 'utf8')
  const entries = parse(md).filter(
    (e) => e.description.length > 0 || Object.keys(e.meta).length > 0
  )
  console.log(`Fandt ${entries.length} sektioner.`)

  // Skriv altid SQL-fil som backup/manuel vej
  const sqlPath = resolve(root, 'sql/descriptions_update.sql')
  writeFileSync(sqlPath, buildSql(entries), 'utf8')
  console.log(`SQL skrevet til: sql/descriptions_update.sql`)

  let ok = 0, missing = 0, failed = 0
  for (const e of entries) {
    const payload = {}
    if (e.description.length > 0) payload.description = e.description
    for (const [col, val] of Object.entries(e.meta)) payload[col] = val
    const fieldNames = Object.keys(payload).join(', ')

    let q = supabase.from('yarns').update(payload)
      .eq('producer', e.producer).eq('name', e.name)
    q = e.series ? q.eq('series', e.series) : q.is('series', null)
    const { data, error } = await q.select('id')
    const label = `${e.producer} / ${e.name}${e.series ? ' / '+e.series : ''}`
    if (error) {
      console.error(`✗ ${label}:`, error.message)
      failed++
    } else if (!data || data.length === 0) {
      console.warn(`? ${label} — ingen match`)
      missing++
    } else {
      console.log(`✓ ${label}  [${fieldNames}]`)
      ok++
    }
  }
  console.log(`\nOpdateret: ${ok}  |  Ikke fundet: ${missing}  |  Fejl: ${failed}`)
  if (failed > 0) {
    console.log(`\nTip: alle ændringer er også skrevet til sql/descriptions_update.sql`)
    console.log(`     — åbn filen, kopier indholdet, og kør det i Supabase SQL Editor.`)
  }

  // On-demand revalidate hvis REVALIDATE_SECRET + site URL er sat
  const site = process.env.NEXT_PUBLIC_SITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (ok > 0 && site && secret) {
    try {
      const res = await fetch(`${site}/garn/api/revalidate?secret=${secret}&path=/`)
      console.log(`Revalidate: ${res.status}`)
    } catch (e) {
      console.warn('Revalidate fejlede:', e.message)
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
