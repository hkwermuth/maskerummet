import type { Metadata } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { fetchStrikkecafeer } from '@/lib/data/stores'
import { StrikkecafeerClient } from './StrikkecafeerClient'

export const metadata: Metadata = {
  title: 'Strikkecaféer — STRIQ',
  description:
    'Find butikker hvor du kan sidde og strikke med andre. Kort og liste over danske garnbutikker med dedikeret strikkecafé.',
  // Light beskyttelse: ingen indeksering af den fulde liste — Hannahs valg.
  // Brugere kan stadig dele direkte links, men siden dukker ikke op i Google.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

// Server-side rendering på hver request — ingen statisk JSON-feed at scrape.
// Light-beskyttelse: kombineres med headers via app/strikkecafeer/headers.ts (ikke nødvendig
// her — Next.js sender Cache-Control: no-store implicit når dynamic='force-dynamic').
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function StrikkecafeerPage() {
  const supabase = createSupabasePublicClient()
  const cafes = await fetchStrikkecafeer(supabase)
  return <StrikkecafeerClient initialCafes={cafes} />
}
