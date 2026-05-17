import type { Metadata } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { fetchAllStores } from '@/lib/data/stores'
import { fetchBrands } from '@/lib/data/retailers'
import { FindForhandlerClient } from './FindForhandlerClient'

export const metadata: Metadata = {
  title: 'Find garnbutikker nær dig — STRIQ',
  description:
    'Søg på by, brug din placering eller udforsk kortet — find fysiske garnbutikker i Danmark.',
}

export const revalidate = 300

type Props = {
  searchParams: Promise<{ brand?: string; retailer?: string }>
}

export default async function FindForhandlerPage({ searchParams }: Props) {
  const supabase = createSupabasePublicClient()
  const [stores, brands] = await Promise.all([
    fetchAllStores(supabase),
    fetchBrands(supabase),
  ])
  const params = await searchParams
  const initialBrand = params.brand?.trim() || null
  const initialRetailerSlug = params.retailer?.trim() || null
  return (
    <FindForhandlerClient
      initialStores={stores}
      brands={brands}
      initialBrand={initialBrand}
      initialRetailerSlug={initialRetailerSlug}
    />
  )
}
