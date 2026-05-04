import type { Metadata } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { fetchSharedProjects } from '@/lib/community'
import { FaellesskabClient } from './FaellesskabClient'

export const metadata: Metadata = {
  title: 'Fællesskabet — STRIQ',
  description:
    'Hent inspiration fra Fællesskabet — se andre strikkeres færdige projekter. Søg på type, garn og opskrift.',
}

export const revalidate = 60

export default async function FaellesskabPage() {
  const supabase = createSupabasePublicClient()
  const projects = await fetchSharedProjects(supabase)
  return <FaellesskabClient initialProjects={projects} />
}
