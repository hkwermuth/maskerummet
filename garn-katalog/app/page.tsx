import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Yarn } from '@/lib/types'
import { YarnFilters } from '@/components/YarnFilters'
import { isEditorEmail } from '@/lib/editors'
import Link from 'next/link'

export const revalidate = 3600

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const showEditor = isEditorEmail(user?.email)
  const { data, error } = await supabase
    .from('yarns_full')
    .select('*')
    .order('producer')
    .order('name')

  if (error) {
    return (
      <div className="text-bark">
        <h1 className="font-serif text-3xl text-forest mb-2">Garn-katalog</h1>
        <p>Kunne ikke hente garner: {error.message}</p>
      </div>
    )
  }

  const yarns = (data ?? []) as Yarn[]

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-forest">Garn-katalog</h1>
          <p className="text-bark mt-2">
            {yarns.length} garner med fibre, løbelængde, strikkefasthed og pleje.
          </p>
        </div>
        {showEditor ? (
          <Link
            href="/admin"
            className="inline-flex items-center bg-forest text-cream px-4 py-2 rounded-lg text-sm hover:opacity-95 whitespace-nowrap"
          >
            Editor
          </Link>
        ) : null}
      </div>
      <YarnFilters yarns={yarns} />
    </div>
  )
}
