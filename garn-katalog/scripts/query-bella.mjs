#!/usr/bin/env node
import { makeAdminClient, loadEnv } from './_yarns-xlsx.mjs'

loadEnv()
const supabase = makeAdminClient()

async function main() {
  const { data, error } = await supabase
    .from('yarns')
    .select('*')
    .eq('producer', 'Permin')
    .ilike('name', 'Bella%')
    .order('name')
    .order('series')

  if (error) throw error

  const rows = data ?? []
  console.log(`Found ${rows.length} rows`)
  for (const r of rows) {
    console.log('\n---')
    console.log(`${r.producer} / ${r.name}${r.series ? ` / ${r.series}` : ''}`)
    console.log({
      id: r.id,
      fiber_main: r.fiber_main,
      thickness_category: r.thickness_category,
      ball_weight_g: r.ball_weight_g,
      length_per_100g_m: r.length_per_100g_m,
      needle_min_mm: r.needle_min_mm,
      needle_max_mm: r.needle_max_mm,
      gauge_stitches_10cm: r.gauge_stitches_10cm,
      gauge_rows_10cm: r.gauge_rows_10cm,
      gauge_needle_mm: r.gauge_needle_mm,
      wash_care: r.wash_care,
      status: r.status,
    })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

