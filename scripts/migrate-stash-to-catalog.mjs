/**
 * Backfill yarn_items.catalog_yarn_id / catalog_color_id from barcode or brand+name+color.
 * Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).
 * Run: node scripts/migrate-stash-to-catalog.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name)
    if (!existsSync(p)) continue
    const raw = readFileSync(p, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
      }
    }
  }
}

loadEnv()

const url =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Mangler VITE_SUPABASE_URL (eller SUPABASE_URL) eller SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { data: items, error } = await supabase
    .from('yarn_items')
    .select('id, brand, name, color_code, barcode, catalog_yarn_id, catalog_color_id')
  if (error) {
    console.error('Kunne ikke hente yarn_items:', error.message)
    process.exit(1)
  }

  let updated = 0
  for (const row of items ?? []) {
    if (row.catalog_yarn_id && row.catalog_color_id) continue

    let catalogYarnId = row.catalog_yarn_id
    let catalogColorId = row.catalog_color_id

    if (!catalogColorId && row.barcode && String(row.barcode).trim()) {
      const bc = String(row.barcode).trim()
      const { data: col } = await supabase
        .from('colors')
        .select('id, yarn_id')
        .eq('barcode', bc)
        .maybeSingle()
      if (col) {
        catalogColorId = col.id
        catalogYarnId = col.yarn_id
      }
    }

    if (!catalogYarnId && row.brand && row.name && row.color_code) {
      const { data: yarns } = await supabase
        .from('yarns')
        .select('id')
        .eq('producer', row.brand.trim())
        .eq('name', row.name.trim())
        .limit(5)
      const yid = yarns?.[0]?.id
      if (yid) {
        const { data: cols } = await supabase
          .from('colors')
          .select('id')
          .eq('yarn_id', yid)
          .eq('color_number', String(row.color_code).trim())
          .limit(1)
        if (cols?.[0]) {
          catalogYarnId = yid
          catalogColorId = cols[0].id
        }
      }
    }

    if (catalogYarnId || catalogColorId) {
      const { error: upErr } = await supabase
        .from('yarn_items')
        .update({
          catalog_yarn_id: catalogYarnId ?? null,
          catalog_color_id: catalogColorId ?? null,
        })
        .eq('id', row.id)
      if (upErr) {
        console.warn(`Skip ${row.id}:`, upErr.message)
        continue
      }
      updated++
    }
  }

  console.log(`Færdig. Opdaterede ${updated} rækker (af ${(items ?? []).length}).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
