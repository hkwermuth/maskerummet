import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'
import { YarnForm } from '@/components/catalog/editor/YarnForm'

export const dynamic = 'force-dynamic'

export default async function NewYarnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/garn/login')
  if (!isEditorEmail(user.email)) redirect('/garn/admin')

  return (
    <div>
      <h1 className="font-serif text-3xl text-striq-sage mb-4">Nyt garn</h1>
      <YarnForm />
    </div>
  )
}
