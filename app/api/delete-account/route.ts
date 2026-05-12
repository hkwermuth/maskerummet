import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Sletter den aktuelle brugers konto og alle tilhørende data.
 *
 * Sikkerhed:
 *  - user.id hentes fra server-session, ALDRIG fra request body (undgår IDOR).
 *  - Endpoint kræver gyldig session — anonymous calls afvises med 401.
 *
 * Cleanup-strategi:
 *  - De fleste bruger-tabeller har `ON DELETE CASCADE` på user_id-FK'er, så
 *    `auth.admin.deleteUser()` alene ville cascade dem. Vi sletter dog
 *    eksplicit alligevel — yarn_items og yarn_usage er ikke i migrations,
 *    så vi kan ikke verificere deres FK-adfærd from-scratch.
 *  - Service_role-klient omgår RLS, så DELETE virker uanset policies.
 *  - profiles bruger `id` (ikke user_id) som FK til auth.users.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userId = user.id
  const admin = createSupabaseAdminClient()

  // Tabeller med user_id-kolonne. Rækkefølgen er ikke kritisk pga. cascades,
  // men yarn_usage før projects undgår at vi rammer FK midlertidigt.
  const userTables = [
    'yarn_usage',
    'yarn_items',
    'saved_recipes',
    'barcode_suggestions',
    'substitution_votes',
    'substitution_suggestions',
    'projects',
  ]

  const errors: string[] = []
  for (const table of userTables) {
    const { error } = await admin.from(table).delete().eq('user_id', userId)
    if (error) {
      errors.push(`${table}: ${error.message}`)
    }
  }

  // profiles bruger `id` (ikke user_id) som FK til auth.users.
  const { error: profileErr } = await admin.from('profiles').delete().eq('id', userId)
  if (profileErr) {
    errors.push(`profiles: ${profileErr.message}`)
  }

  // Til sidst: slet selve auth-user'en.
  const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(userId)
  if (deleteAuthErr) {
    return NextResponse.json(
      {
        error: `Kunne ikke slette kontoen: ${deleteAuthErr.message}`,
        dataDeletionErrors: errors,
      },
      { status: 500 }
    )
  }

  // Log brugeren ud i den nuværende session.
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
