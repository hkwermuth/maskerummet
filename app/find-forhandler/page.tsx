import type { Metadata } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { fetchAllStores } from '@/lib/data/stores'
import { fetchOnlineRetailers, fetchBrands } from '@/lib/data/retailers'
import { FindForhandlerClient } from './FindForhandlerClient'

export const metadata: Metadata = {
  title: 'Find garnbutikker nær dig eller online — STRIQ',
  description:
    'Søg på by, brug din placering eller udforsk kortet — eller gå direkte til online-oversigten og se hvem der forhandler dit yndlingsmærke.',
}

export const revalidate = 300

export default async function FindForhandlerPage() {
  const supabase = createSupabasePublicClient()
  const [stores, retailers, brands] = await Promise.all([
    fetchAllStores(supabase),
    fetchOnlineRetailers(supabase),
    fetchBrands(supabase),
  ])
  return (
    <FindForhandlerClient
      initialStores={stores}
      retailers={retailers}
      brands={brands}
    />
  )
}
