#!/usr/bin/env node
/**
 * Eksporterer alle garner + farver fra Supabase til content/yarns.xlsx.
 *
 * Kør: npm run export:yarns
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import * as XLSX from 'xlsx'
import {
  loadEnv,
  makeAdminClient,
  YARN_COLUMNS,
  COLOR_COLUMNS,
  yarnRowToCells,
} from './_yarns-xlsx.mjs'

const root = loadEnv()
const supabase = makeAdminClient()

async function run() {
  // 1. Hent yarns + fibers (yarns_full-viewet har ikke grant til service_role)
  const { data: yarns, error: yErr } = await supabase
    .from('yarns')
    .select('*')
    .order('producer', { ascending: true })
    .order('name', { ascending: true })
  if (yErr) { console.error('yarns fejl:', yErr.message); process.exit(1) }
  console.log(`Hentet ${yarns.length} garner`)

  const { data: fiberRows, error: fErr } = await supabase
    .from('yarn_fiber_components')
    .select('yarn_id, fiber, percentage, sort_order')
    .order('yarn_id', { ascending: true })
    .order('sort_order', { ascending: true })
  if (fErr) { console.error('yarn_fiber_components fejl:', fErr.message); process.exit(1) }
  const fibersByYarn = new Map()
  for (const f of fiberRows) {
    if (!fibersByYarn.has(f.yarn_id)) fibersByYarn.set(f.yarn_id, [])
    fibersByYarn.get(f.yarn_id).push({ fiber: f.fiber, percentage: f.percentage })
  }
  console.log(`Hentet ${fiberRows.length} fiber-komponenter`)

  // 2. Hent farver
  const { data: colors, error: cErr } = await supabase
    .from('colors')
    .select('id, yarn_id, color_number, color_name, color_family, hex_code, status, image_url')
    .order('yarn_id', { ascending: true })
    .order('color_number', { ascending: true })
  if (cErr) { console.error('colors fejl:', cErr.message); process.exit(1) }
  console.log(`Hentet ${colors.length} farver`)

  // Byg yarn_id → "producer|name|series" lookup
  const idToLookup = new Map()
  for (const y of yarns) {
    idToLookup.set(y.id, `${y.producer}|${y.name}|${y.series ?? ''}`)
  }

  // 3. Konverter til Excel-rækker
  const yarnRows = yarns.map((y) => yarnRowToCells(y, fibersByYarn.get(y.id) ?? []))
  const colorRows = colors.map((c) => ({
    id: c.id,
    yarn_id: c.yarn_id,
    yarn_lookup: idToLookup.get(c.yarn_id) ?? '',
    color_number: c.color_number ?? '',
    color_name: c.color_name ?? '',
    color_family: c.color_family ?? '',
    hex_code: c.hex_code ?? '',
    status: c.status ?? '',
    image_url: c.image_url ?? '',
  }))

  // 4. Skriv workbook
  const wb = XLSX.utils.book_new()
  const wsYarns = XLSX.utils.json_to_sheet(yarnRows, { header: YARN_COLUMNS })
  const wsColors = XLSX.utils.json_to_sheet(colorRows, { header: COLOR_COLUMNS })
  XLSX.utils.book_append_sheet(wb, wsYarns, 'yarns')
  XLSX.utils.book_append_sheet(wb, wsColors, 'colors')

  const outPath = resolve(root, 'content/yarns.xlsx')
  mkdirSync(dirname(outPath), { recursive: true })
  XLSX.writeFile(wb, outPath)

  console.log(`\nSkrevet til: content/yarns.xlsx`)
  console.log(`  ${yarnRows.length} garner, ${colorRows.length} farver`)
  console.log(`\n⚠  Husk: hvis du importerer en gammel version af denne fil,`)
  console.log(`   overskriver du ændringer der er lavet i appen siden eksporten.`)
  console.log(`   Kør altid 'npm run export:yarns' lige før du redigerer.`)
}

run().catch((e) => { console.error(e); process.exit(1) })
