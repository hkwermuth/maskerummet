/**
 * Fælles definitioner for export-yarns.mjs og import-yarns.mjs.
 * Sørger for at de altid er enige om kolonner og JSON-felter.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export const YARN_COLUMNS = [
  'id',
  'producer',
  'name',
  'series',
  'fiber_main',
  'thickness_category',
  'ball_weight_g',
  'length_per_100g_m',
  'needle_min_mm',
  'needle_max_mm',
  'gauge_stitches_10cm',
  'gauge_rows_10cm',
  'gauge_needle_mm',
  'twist_structure',
  'ply_count',
  'spin_type',
  'finish',
  'wash_care',
  'origin_country',
  'fiber_origin_country',
  'status',
  'certifications',
  'seasonal_suitability',
  'use_cases',
  'description',
  'fibers',
]

// Felter der skrives som JSON-streng i én Excel-celle
export const JSON_FIELDS = new Set([
  'certifications',
  'seasonal_suitability',
  'use_cases',
  'fibers',
])

// Felter der gemmes på yarns-tabellen direkte (alt undtagen id, fibers — fibers ligger i yarn_fiber_components)
export const YARN_TABLE_COLUMNS = YARN_COLUMNS.filter(
  (c) => c !== 'id' && c !== 'fibers'
)

export const COLOR_COLUMNS = [
  'id',
  'yarn_id',
  'yarn_lookup', // hjælpekolonne: producer|name|series for nye garner uden id endnu
  'color_number',
  'color_name',
  'color_family',
  'hex_code',
  'status',
  'image_url',
]

export function loadEnv() {
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
  return root
}

export function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local')
    process.exit(1)
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Serialisér en yarn-række til Excel-format (JSON-felter → strenge). */
export function yarnRowToCells(yarn, fibers) {
  const row = {}
  for (const col of YARN_COLUMNS) {
    if (col === 'fibers') {
      row[col] = fibers && fibers.length > 0 ? JSON.stringify(fibers) : ''
      continue
    }
    const v = yarn[col]
    if (v === null || v === undefined) {
      row[col] = ''
    } else if (JSON_FIELDS.has(col)) {
      row[col] = JSON.stringify(v)
    } else {
      row[col] = v
    }
  }
  return row
}

/** Parsér en Excel-række tilbage til { yarnPayload, fibers }. */
export function cellsToYarnPayload(row) {
  const payload = {}
  let fibers = null
  for (const col of YARN_COLUMNS) {
    const raw = row[col]
    if (col === 'id') continue
    if (col === 'fibers') {
      if (raw && String(raw).trim()) {
        try { fibers = JSON.parse(raw) } catch { throw new Error(`Ugyldig JSON i fibers: ${raw}`) }
      } else {
        fibers = []
      }
      continue
    }
    if (raw === undefined || raw === '' || raw === null) {
      payload[col] = null
      continue
    }
    if (JSON_FIELDS.has(col)) {
      try { payload[col] = JSON.parse(raw) } catch { throw new Error(`Ugyldig JSON i ${col}: ${raw}`) }
    } else {
      payload[col] = raw
    }
  }
  return { id: row.id || null, payload, fibers }
}
