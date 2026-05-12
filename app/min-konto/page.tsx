import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import MinKontoClient from './MinKontoClient'

export const metadata = {
  title: 'Min konto – STRIQ',
  description: 'Download dine data eller administrér din STRIQ-konto.',
}

export default async function MinKontoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 74px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F3EE', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '48px 24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#61846D', margin: '0 0 8px' }}>Min konto</h2>
          <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.6, margin: '0 0 24px' }}>Log ind for at administrere din konto og downloade dine data.</p>
          <Link href="/login?next=/min-konto" style={{ background: '#61846D', color: '#fff', borderRadius: 24, padding: '10px 28px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Log ind
          </Link>
        </div>
      </div>
    )
  }

  return <MinKontoClient email={user.email ?? ''} />
}
