/**
 * Seed af Fællesskabet: markerer udvalgte projekter som is_shared=true.
 *
 * Henter projekter for de to seed-brugere, deduplikerer på (titel, billede-URL),
 * og sætter is_shared=true + gætter project_type ud fra titlen. Rører ikke
 * noter eller anden privat data.
 *
 * Brug:
 *   node scripts/seed-faellesskabet.mjs           # dry-run (default)
 *   node scripts/seed-faellesskabet.mjs --commit  # skriver faktisk
 */
import { loadEnv, makeAdminClient } from './_yarns-xlsx.mjs'

loadEnv()
const supabase = makeAdminClient()

const SEED_EMAILS = ['hkwermuth@gmail.com', 'hannah@leanmind.dk']
const COMMIT = process.argv.includes('--commit')
const DRY = !COMMIT

function guessType(title) {
  if (!title) return 'andet'
  const t = title.toLowerCase()
  if (/cardigan|jakke/.test(t))                    return 'cardigan'
  if (/sweater|bluse|pullover/.test(t))            return 'sweater'
  if (/\btop\b|singlet/.test(t))                   return 'top'
  if (/\bhue\b|kyse|m[uü]tze|beanie/.test(t))      return 'hue'
  if (/sjal|shawl|stola/.test(t))                  return 'sjal'
  if (/str[øo]mp|sok(?:ke|s|ker|kerne)?/.test(t))  return 'stroemper'
  if (/\bvest\b|veste/.test(t))                    return 'vest'
  if (/tr[øo]je/.test(t))                          return 'troeje'
  if (/t[øo]rkl[aæ]d/.test(t))                     return 'toerklaede'
  if (/t[aæ]ppe|blanket|plaid/.test(t))            return 'taeppe'
  return 'andet'
}

async function listTargetUsers() {
  const all = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const batch = data?.users ?? []
    all.push(...batch)
    if (batch.length < 200) break
    page++
  }
  const lookup = new Set(SEED_EMAILS.map(e => e.toLowerCase()))
  return all.filter(u => lookup.has((u.email || '').toLowerCase()))
}

async function main() {
  console.log(`Seed-mode: ${DRY ? 'DRY-RUN (ingen skrivninger)' : 'COMMIT'}`)
  console.log(`Målrettede emails: ${SEED_EMAILS.join(', ')}`)

  const users = await listTargetUsers()
  if (users.length === 0) {
    console.log('Ingen matchende brugere fundet.')
    return
  }
  for (const u of users) console.log(`  · ${u.email} (${u.id})`)

  const userIds = users.map(u => u.id)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id,user_id,title,project_image_url,is_shared,project_type,pattern_name,pattern_designer,created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: true })
  if (error) throw error

  console.log(`\nFundet ${projects.length} projekt(er) på tværs af brugere.`)

  const seen = new Set()
  const plan = []
  const missingPattern = []
  for (const p of projects) {
    const key = `${(p.title || '').trim().toLowerCase()}|${(p.project_image_url || '').trim()}`
    if (seen.has(key)) {
      console.log(`  − skip duplikat: ${p.title || '(uden titel)'}`)
      continue
    }
    seen.add(key)
    if (p.is_shared) {
      console.log(`  ✓ allerede delt: ${p.title || '(uden titel)'}`)
      continue
    }
    const projectType = p.project_type || guessType(p.title)
    const hasPatternInfo = !!(p.pattern_name && p.pattern_designer)
    if (!hasPatternInfo) missingPattern.push(p.title || '(uden titel)')
    plan.push({ id: p.id, user_id: p.user_id, title: p.title, projectType })
  }

  if (missingPattern.length > 0) {
    console.log('')
    console.log('⚠  Følgende projekter mangler pattern_name/pattern_designer og deles uden copyright-attestering:')
    for (const title of missingPattern) console.log(`    - ${title}`)
    console.log('   (disse projekter vises i fællesskabet uden opskriftsinfo — udfyld manuelt bagefter)')
  }

  if (plan.length === 0) {
    console.log('\nIntet at dele. Slut.')
    return
  }

  console.log(`\nPlan: ${plan.length} projekt(er) bliver delt:`)
  for (const x of plan) {
    console.log(`  · ${x.title || '(uden titel)'}  [${x.projectType}]`)
  }

  if (DRY) {
    console.log('\n(dry-run) Ingen ændringer skrevet. Kør med --commit for at dele.')
    return
  }

  // Lazy upsert af profiles for seed-brugerne (uden display_name)
  for (const u of users) {
    const { error: pErr } = await supabase
      .from('profiles')
      .upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true })
    if (pErr) console.warn(`  advarsel: kunne ikke upserte profil for ${u.email}:`, pErr.message)
  }

  const sharedAt = new Date().toISOString()
  let ok = 0
  for (const x of plan) {
    const { error: uErr } = await supabase
      .from('projects')
      .update({
        is_shared: true,
        shared_at: sharedAt,
        project_type: x.projectType,
      })
      .eq('id', x.id)
    if (uErr) {
      console.error(`  ✗ ${x.title}:`, uErr.message)
      continue
    }
    ok++
  }

  console.log(`\n✓ Delte ${ok}/${plan.length} projekter.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
