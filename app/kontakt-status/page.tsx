import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'
import KontaktStatusClient from './KontaktStatusClient'

export default async function KontaktStatusPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isEditorEmail(user.email)) {
    return (
      <div style={{ minHeight: 'calc(100vh - 74px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F3EE' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '48px 24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#9B6272', margin: '0 0 8px' }}>
            Kontakt-status
          </h2>
          <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.6, margin: '0 0 24px' }}>
            Denne side er kun for administratorer.
          </p>
          {!user && (
            <Link href="/login?next=/kontakt-status" style={{ background: '#9B6272', color: '#fff', borderRadius: 24, padding: '10px 28px', fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              Log ind
            </Link>
          )}
        </div>
      </div>
    )
  }

  return <KontaktStatusClient />
}
