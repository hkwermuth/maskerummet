import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/garn/login')
  if (!isEditorEmail(user.email)) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-striq-sage">Adgang nægtet</h1>
        <p className="text-striq-muted mt-2">
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
        <h1 className="font-serif text-3xl text-striq-sage">Editor: garn</h1>
        <div className="flex items-center gap-2">
          <Link href="/garn/admin/suggestions" className="bg-striq-border text-striq-muted px-4 py-2 rounded-lg text-sm">
            Moderation
          </Link>
          <Link href="/garn/admin/new" className="bg-striq-sage text-cream px-4 py-2 rounded-lg text-sm">
            + Nyt garn
          </Link>
        </div>
      </div>
      <div className="bg-cream border border-striq-border rounded-xl divide-y divide-striq-border">
        {(!yarns || yarns.length === 0) && (
          <div className="text-center py-12 text-striq-muted text-sm">
            Ingen garner i kataloget endnu. Klik &quot;+ Nyt garn&quot; for at tilføje det første.
          </div>
        )}
        {(yarns ?? []).map((y) => (
          <Link
            key={y.id}
            href={`/garn/admin/${y.id}/edit`}
            className="flex items-center justify-between px-4 py-3 hover:bg-striq-bg"
          >
            <div>
              <div className="font-medium text-striq-sage">{y.producer} {y.name}</div>
              {y.series && <div className="text-xs text-striq-muted">{y.series}</div>}
            </div>
            <div className="text-xs text-striq-muted">{y.status}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
