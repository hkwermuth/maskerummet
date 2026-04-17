import { createSupabaseAdminClient } from './supabase/admin'

export function getEditorEmails(): string[] {
  return (process.env.EDITOR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isEditorEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getEditorEmails().includes(email.toLowerCase())
}

/**
 * Sørg for at brugeren har 'editor'-rolle i user_profiles, hvis deres email
 * er på allowlisten. Kaldes efter auth callback. Bruger service-role klient
 * til at bypasse RLS på user_profiles.
 */
export async function ensureEditorRole(userId: string, email: string | null | undefined) {
  if (!isEditorEmail(email)) return false
  const admin = createSupabaseAdminClient()
  await admin.from('user_profiles').upsert(
    { id: userId, role: 'editor' },
    { onConflict: 'id' }
  )
  return true
}
