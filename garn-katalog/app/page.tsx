import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Yarn } from '@/lib/types'
import { YarnFilters } from '@/components/YarnFilters'

export const revalidate = 3600

export default async function Page() {
  const supabase = await createSupabaseServerClient()
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
      <div className="mb-6">
        <h1 className="font-serif text-4xl text-forest">Garn-katalog</h1>
        <p className="text-bark mt-2">
          {yarns.length} garner med fibre, løbelængde, strikkefasthed og pleje.
        </p>
      </div>
      <YarnFilters yarns={yarns} />
    </div>
  )
}
