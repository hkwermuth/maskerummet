#!/usr/bin/env node
/**
 * Importerer garner + farver fra content/yarns.xlsx til Supabase.
 *
 * Brug:
 *   npm run import:yarns           # kør import
 *   npm run import:yarns -- --dry  # vis hvad der ville ske, uden at skrive
 *
 * Match-strategi for ark "yarns":
 *   - Hvis id er udfyldt → update på id
 *   - Ellers → match på (producer, name, series); update hvis findes, ellers insert
 *
 * Match-strategi for ark "colors":
 *   - Hvis yarn_id er tomt, slå op via yarn_lookup ("producer|name|series")
 *   - Hvis id er udfyldt → update; ellers match på (yarn_id, color_number); ellers insert
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import {
  loadEnv,
  makeAdminClient,
  YARN_TABLE_COLUMNS,
  cellsToYarnPayload,
} from './_yarns-xlsx.mjs'

const root = loadEnv()
const supabase = makeAdminClient()
const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run')

async function findYarnByNaturalKey(producer, name, series) {
  let q = supabase.from('yarns').select('id').eq('producer', producer).eq('name', name)
  q = series ? q.eq('series', series) : q.is('series', null)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data?.id ?? null
}

async function upsertYarn(row) {
  const { id, payload, fibers } = cellsToYarnPayload(row)

  // Behold kun gyldige tabelkolonner
  const cleanPayload = {}
  for (const col of YARN_TABLE_COLUMNS) {
    if (payload[col] !== undefined) cleanPayload[col] = payload[col]
  }
  if (!cleanPayload.producer || !cleanPayload.name) {
    throw new Error(`Mangler producer eller name: ${JSON.stringify(row)}`)
  }

  let yarnId = id
  let action = ''
  if (yarnId) {
    if (!DRY) {
      const { error } = await supabase.from('yarns').update(cleanPayload).eq('id', yarnId)
      if (error) throw error
    }
    action = 'opdateret (id)'
  } else {
    const existing = await findYarnByNaturalKey(
      cleanPayload.producer, cleanPayload.name, cleanPayload.series
    )
    if (existing) {
      yarnId = existing
      if (!DRY) {
        const { error } = await supabase.from('yarns').update(cleanPayload).eq('id', yarnId)
        if (error) throw error
      }
      action = 'opdateret (match)'
    } else {
      if (!DRY) {
        const { data, error } = await supabase
          .from('yarns').insert(cleanPayload).select('id').single()
        if (error) throw error
        yarnId = data.id
      } else {
        yarnId = '(ny-uuid)'
      }
      action = 'INDSAT'
    }
  }

  // Erstat fibers (samme mønster som YarnForm.tsx)
  if (fibers !== null && yarnId && yarnId !== '(ny-uuid)') {
    if (!DRY) {
      const { error: dErr } = await supabase
        .from('yarn_fiber_components').delete().eq('yarn_id', yarnId)
      if (dErr) throw dErr
      if (fibers.length > 0) {
        const { error: iErr } = await supabase.from('yarn_fiber_components').insert(
          fibers.map((f, i) => ({
            yarn_id: yarnId,
            fiber: f.fiber,
            percentage: f.percentage,
            sort_order: i,
          }))
        )
        if (iErr) throw iErr
      }
    }
  }

  return { yarnId, action }
}

async function upsertColor(row, lookupCache) {
  let yarnId = row.yarn_id || null
  if (!yarnId && row.yarn_lookup) {
    if (lookupCache.has(row.yarn_lookup)) {
      yarnId = lookupCache.get(row.yarn_lookup)
    } else {
      const [producer, name, series] = row.yarn_lookup.split('|')
      yarnId = await findYarnByNaturalKey(producer, name, series || null)
      lookupCache.set(row.yarn_lookup, yarnId)
    }
  }
  if (!yarnId) {
    throw new Error(`Farve uden yarn_id og uden gyldig yarn_lookup: ${JSON.stringify(row)}`)
  }

  const payload = {
    yarn_id: yarnId,
    color_number: row.color_number || null,
    color_name: row.color_name || null,
    color_family: row.color_family || null,
    hex_code: row.hex_code || null,
    status: row.status || null,
    image_url: row.image_url || null,
    barcode: row.barcode ? String(row.barcode).trim() || null : null,
  }

  if (row.id) {
    if (!DRY) {
      const { error } = await supabase.from('colors').update(payload).eq('id', row.id)
      if (error) throw error
    }
    return 'opdateret (id)'
  }

  // Find eksisterende på (yarn_id, color_number)
  if (payload.color_number) {
    const { data } = await supabase
      .from('colors').select('id')
      .eq('yarn_id', yarnId).eq('color_number', payload.color_number).maybeSingle()
    if (data?.id) {
      if (!DRY) {
        const { error } = await supabase.from('colors').update(payload).eq('id', data.id)
        if (error) throw error
      }
      return 'opdateret (match)'
    }
  }

  if (!DRY) {
    const { error } = await supabase.from('colors').insert(payload)
    if (error) throw error
  }
  return 'INDSAT'
}

async function run() {
  const xlsxPath = resolve(root, 'content/yarns.xlsx')
  let buf
  try { buf = readFileSync(xlsxPath) }
  catch { console.error(`Kan ikke læse ${xlsxPath}. Kør 'npm run export:yarns' først.`); process.exit(1) }

  const wb = XLSX.read(buf, { type: 'buffer' })

  // Find yarn-ark: foretræk 'yarns', fald tilbage til første ark (ignorér "Forklaring")
  let yarnSheetName = 'yarns'
  if (!wb.SheetNames.includes(yarnSheetName)) {
    const fallback = wb.SheetNames.find((n) => n.toLowerCase() !== 'forklaring')
    if (!fallback) {
      console.error(`Mangler ark "yarns" i workbook. Fundne ark: ${wb.SheetNames.join(', ')}`)
      process.exit(1)
    }
    yarnSheetName = fallback
    console.warn(`⚠️  Ingen "yarns"-ark — bruger "${yarnSheetName}" i stedet. Omdøb arket til "yarns" for at fjerne denne advarsel.`)
  }

  const yarnRows = XLSX.utils.sheet_to_json(wb.Sheets[yarnSheetName], { defval: '' })
  const colorRows = wb.SheetNames.includes('colors')
    ? XLSX.utils.sheet_to_json(wb.Sheets['colors'], { defval: '' })
    : []

  console.log(`Læst ${yarnRows.length} garner og ${colorRows.length} farver`)
  if (DRY) console.log('** DRY RUN — ingen ændringer skrives **\n')

  const lookupCache = new Map()
  let yOk = 0, yNew = 0, yFail = 0
  for (const row of yarnRows) {
    const label = `${row.producer} / ${row.name}${row.series ? ' / '+row.series : ''}`
    try {
      const { yarnId, action } = await upsertYarn(row)
      if (action === 'INDSAT') yNew++
      else yOk++
      console.log(`✓ ${label}  [${action}]`)
      if (row.producer && row.name) {
        const key = `${row.producer}|${row.name}|${row.series ?? ''}`
        lookupCache.set(key, yarnId)
      }
    } catch (e) {
      yFail++
      console.error(`✗ ${label}: ${e.message}`)
    }
  }

  let cOk = 0, cNew = 0, cFail = 0
  for (const row of colorRows) {
    const label = `${row.yarn_lookup || row.yarn_id} / ${row.color_number} ${row.color_name ?? ''}`
    try {
      const action = await upsertColor(row, lookupCache)
      if (action === 'INDSAT') cNew++
      else cOk++
      console.log(`✓ farve ${label}  [${action}]`)
    } catch (e) {
      cFail++
      console.error(`✗ farve ${label}: ${e.message}`)
    }
  }

  console.log(`\nGarner:  opdateret ${yOk}, nye ${yNew}, fejl ${yFail}`)
  console.log(`Farver:  opdateret ${cOk}, nye ${cNew}, fejl ${cFail}`)

  // Revalidate
  const site = process.env.NEXT_PUBLIC_SITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!DRY && (yOk + yNew + cOk + cNew) > 0 && site && secret) {
    try {
      const res = await fetch(
        `${site}/api/revalidate?secret=${secret}&path=/garn`,
        { method: 'POST' }
      )
      console.log(`Revalidate: ${res.status}`)
    } catch (e) {
      console.warn('Revalidate fejlede:', e.message)
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
