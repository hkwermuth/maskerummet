// Diagnose: hvor er brugerens projekter?
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'

loadEnv()
const supabase = makeAdminClient()

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('')

// 1. Total antal projekter
const { data: all, error: aErr, count: total } = await supabase
  .from('projects')
  .select('id', { count: 'exact', head: true })
if (aErr) { console.error('FEJL query 1:', aErr); process.exit(1) }
console.log(`1. Total antal projekter i DB: ${total}`)
console.log('')

// 2. Projekter pr. user_id
const { data: byUser, error: bErr } = await supabase
  .from('projects')
  .select('user_id')
if (bErr) { console.error('FEJL query 2:', bErr); process.exit(1) }
const counts = new Map()
for (const r of byUser ?? []) {
  counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1)
}
console.log('2. Projekter pr. user_id:')
if (counts.size === 0) console.log('   (ingen)')
for (const [uid, n] of [...counts.entries()].sort((a,b) => b[1] - a[1])) {
  console.log(`   ${uid} → ${n} projekter`)
}
console.log('')

// 3. Slå email-adresser op via auth.admin
console.log('3. Brugere i auth:')
const emails = ['hkwermuth@gmail.com', 'hannah@leanmind.dk']
let page = 1
const userMap = new Map()
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
  if (error) { console.error('FEJL query 3:', error); process.exit(1) }
  for (const u of data.users) userMap.set(u.email, u)
  if (data.users.length < 200) break
  page++
}
for (const email of emails) {
  const u = userMap.get(email)
  if (u) {
    const n = counts.get(u.id) ?? 0
    console.log(`   ${email} → id=${u.id}, oprettet=${u.created_at}, projekter=${n}`)
  } else {
    console.log(`   ${email} → IKKE FUNDET i auth.users`)
  }
}
console.log('')

// 4. Status-fordeling (hvis kolonnen findes)
const { data: statusData, error: sErr } = await supabase
  .from('projects')
  .select('status')
if (sErr) {
  console.log('4. Status-query fejler:', sErr.message)
} else {
  const s = new Map()
  for (const r of statusData ?? []) {
    s.set(r.status ?? '(null)', (s.get(r.status ?? '(null)') ?? 0) + 1)
  }
  console.log('4. Status-fordeling:')
  if (s.size === 0) console.log('   (ingen projekter)')
  for (const [k, v] of s) console.log(`   ${k} → ${v}`)
}

process.exit(0)
