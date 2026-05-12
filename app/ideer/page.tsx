import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'
import IdeerClient from './IdeerClient'

export default async function IdeerPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isEditorEmail(user?.email)

  return <IdeerClient userId={user?.id ?? null} isAdmin={isAdmin} />
}
