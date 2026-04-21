/**
 * Engangs-opdatering af is_example flag på visualizations.
 * Fjerner de 2 sidste eksempler og tilføjer turkis-nederdelen.
 * Kører: node scripts/swap-viz-examples.mjs
 */
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'

loadEnv()
const supabase = makeAdminClient()

const REMOVE = [
  'd43997ae-b965-4a47-aed3-e153737c9de1', // Lyseblå + Pink
  '4b3bedbf-d7ba-4546-b717-56fc21ce108a', // Efterårsbær
]
const ADD = [
  '70d23fb5-b38f-4381-b53e-971dc3f6c03b', // Klar turkis — turkis nederdel
]

async function main() {
  for (const id of REMOVE) {
    const { error } = await supabase
      .from('visualizations').update({ is_example: false }).eq('id', id)
    if (error) { console.error(`✗ ${id}: ${error.message}`); continue }
    console.log(`✓ Fjernet eksempel: ${id}`)
  }
  for (const id of ADD) {
    const { error } = await supabase
      .from('visualizations').update({ is_example: true }).eq('id', id)
    if (error) { console.error(`✗ ${id}: ${error.message}`); continue }
    console.log(`✓ Tilføjet eksempel: ${id}`)
  }

  const { data } = await supabase
    .from('visualizations').select('id').eq('is_example', true)
  console.log(`\nTotal eksempler nu: ${data?.length ?? '?'}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
