import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isEditorEmail(user.email)) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Adgang nægtet</h1>
        <p className="text-bark mt-2">
          Din email ({user.email}) er ikke på editor-listen.
        </p>
      </div>
    )
  }

  const { data: yarns } = await supabase
    .from('yarns')
    .select('id, producer, name, series, status, updated_at')
    .order('updated_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-forest">Editor: garn</h1>
        <Link href="/admin/new" className="bg-forest text-cream px-4 py-2 rounded-lg text-sm">
          + Nyt garn
        </Link>
      </div>
      <div className="bg-cream border border-stone rounded-xl divide-y divide-stone">
        {(yarns ?? []).map((y) => (
          <Link
            key={y.id}
            href={`/admin/${y.id}/edit`}
            className="flex items-center justify-between px-4 py-3 hover:bg-sand"
          >
            <div>
              <div className="font-medium text-forest">
                {y.producer} {y.name}
              </div>
              {y.series && <div className="text-xs text-bark">{y.series}</div>}
            </div>
            <div className="text-xs text-bark">{y.status}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
