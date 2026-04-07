import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'
import { YarnForm } from '@/components/editor/YarnForm'
import type { Yarn } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditYarnPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isEditorEmail(user.email)) redirect('/admin')

  const { data: yarn } = await supabase
    .from('yarns_full')
    .select('*')
    .eq('id', id)
    .single()
  if (!yarn) notFound()

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest mb-4">
        Rediger: {(yarn as Yarn).producer} {(yarn as Yarn).name}
      </h1>
      <YarnForm initial={yarn as Yarn} />
    </div>
  )
}
