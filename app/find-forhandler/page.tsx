import type { Metadata } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { fetchAllStores } from '@/lib/data/stores'
import { FindForhandlerClient } from './FindForhandlerClient'

export const metadata: Metadata = {
  title: 'Find garnbutikker nær dig — Striq',
  description:
    'Søg på by, brug din placering eller udforsk kortet — find 200+ danske garnbutikker.',
}

export const revalidate = 300

export default async function FindForhandlerPage() {
  const supabase = createSupabasePublicClient()
  const stores = await fetchAllStores(supabase)
  return <FindForhandlerClient initialStores={stores} />
}
