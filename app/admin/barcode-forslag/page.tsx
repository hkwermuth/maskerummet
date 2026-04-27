import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'
import { listPendingBarcodeSuggestions } from '@/lib/data/barcodeSuggestions'
import BarcodeForslagListe from './BarcodeForslagListe'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Stregkode-forslag — moderation',
}

export default async function BarcodeForslagAdminPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/garn/login')
  if (!isEditorEmail(user.email)) redirect('/garn/admin')

  const suggestions = await listPendingBarcodeSuggestions(supabase)

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl text-striq-sage mb-2">Stregkode-forslag</h1>
      <p className="text-sm text-striq-muted mb-6">
        Brugere har sendt {suggestions.length} forslag til kobling mellem EAN og garn-katalog.
        Når du godkender en kobling, sættes EAN&apos;en på den valgte farve og bliver tilgængelig for alle.
      </p>

      <BarcodeForslagListe suggestions={suggestions} />
    </div>
  )
}
