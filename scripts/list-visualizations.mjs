/**
 * Viser hkwermuths visualiseringer så vi kan finde den rigtige turkis sweater.
 * Kører: node scripts/list-visualizations.mjs
 */
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'

loadEnv()
const supabase = makeAdminClient()

const TARGET_EMAIL = 'hkwermuth@gmail.com'

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  const target = users.users.find(
    (u) => (u.email || '').toLowerCase() === TARGET_EMAIL.toLowerCase()
  )
  if (!target) {
    console.error(`Fandt ikke bruger: ${TARGET_EMAIL}`)
    users.users.forEach((u) => console.log('  ', u.email, u.id))
    process.exit(1)
  }

  console.log(`${TARGET_EMAIL}: ${target.id}\n`)

  const { data: viz } = await supabase
    .from('visualizations')
    .select('id, yarn_info, created_at, is_example, original_url, result_url')
    .eq('user_id', target.id)
    .order('created_at', { ascending: false })

  console.log(`=== ${viz?.length ?? 0} visualiseringer ===`)
  viz?.forEach((v, i) => {
    const colors = v.yarn_info?.colors?.map((c) => `${c.colorNameDa ?? c.colorName} (${c.hex})`).join(', ')
    console.log(`${i + 1}. ${v.id}  ${v.is_example ? '[EKSEMPEL]' : ''}`)
    console.log(`   dato: ${v.created_at}`)
    console.log(`   farver: ${colors}`)
    console.log(`   result: ${v.result_url.split('?')[0].split('/').pop()}`)
    console.log()
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
