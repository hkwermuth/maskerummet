import type { Metadata } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { fetchOnlineRetailers, fetchBrands } from '@/lib/data/retailers'
import { OnlineForhandlereClient } from './OnlineForhandlereClient'

export const metadata: Metadata = {
  title: 'Køb garn online — STRIQ',
  description:
    'Find online forhandlere af dit yndlingsgarn. Alle webshops leverer til Danmark.',
}

export const revalidate = 300

type Props = {
  searchParams: Promise<{ brand?: string }>
}

export default async function OnlineForhandlerePage({ searchParams }: Props) {
  const supabase = createSupabasePublicClient()
  const [retailers, brands] = await Promise.all([
    fetchOnlineRetailers(supabase),
    fetchBrands(supabase),
  ])
  const params = await searchParams
  const initialBrand = params.brand?.trim() || null
  return (
    <OnlineForhandlereClient
      retailers={retailers}
      brands={brands}
      initialBrand={initialBrand}
    />
  )
}
