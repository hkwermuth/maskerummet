import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Yarn } from '@/lib/types'
import { YarnFilters } from '@/components/catalog/YarnFilters'
import { isEditorEmail } from '@/lib/editors'
import Link from 'next/link'

export const revalidate = 3600

export const metadata = {
  title: 'Garn-katalog',
  description: 'Dansk garn-katalog med fibre, løbelængde, pinde, strikkefasthed, pleje og oprindelse.',
}

export default async function GarnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const showEditor = isEditorEmail(user?.email)

  const { data, error } = await supabase
    .from('yarns_full')
    .select('*')
    .order('producer')
    .order('name')

  if (error) {
    return (
      <div className="text-striq-muted">
        <h1 className="font-serif text-3xl text-striq-sage mb-2">Garn-katalog</h1>
        <p>Kunne ikke hente garner: {error.message}</p>
      </div>
    )
  }

  const yarns = (data ?? []) as Yarn[]

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-striq-sage">Garn-katalog</h1>
          <p className="text-striq-muted mt-2">
            {yarns.length} garner med fibre, løbelængde, strikkefasthed og pleje.
          </p>
        </div>
        {showEditor ? (
          <Link
            href="/garn/admin"
            className="inline-flex items-center bg-striq-sage text-cream px-4 py-2 rounded-lg text-sm hover:opacity-95 whitespace-nowrap"
          >
            Editor
          </Link>
        ) : null}
      </div>
      <YarnFilters yarns={yarns} />
    </div>
  )
}
