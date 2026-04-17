import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'
import { ModerationClient } from '@/components/catalog/substitutions/ModerationClient'

export const dynamic = 'force-dynamic'

export default async function SuggestionsModerationPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/garn/login')
  if (!isEditorEmail(user.email)) redirect('/garn/admin')

  return (
    <div>
      <h1 className="font-serif text-3xl text-striq-sage mb-2">Moderation: eksterne forslag</h1>
      <p className="text-sm text-striq-muted mb-6">
        Eksterne forslag vises først offentligt når de er godkendt.
      </p>
      <ModerationClient />
    </div>
  )
}
