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
 * Ensure that the user has 'editor' role in user_profiles if their email is on
 * the allowlist. Called after auth callback. Uses service-role client to bypass
 * RLS on user_profiles.
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
