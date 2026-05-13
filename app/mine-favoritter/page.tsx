import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchSavedRecipes } from '@/lib/data/saved-recipes'

export const metadata = {
  title: 'Mine favoritter — STRIQ',
  description: 'De opskrifter du har gemt med et hjerte.',
}

export default async function MineFavoritterPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 74px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F3EE', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💝</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#61846D', margin: '0 0 8px' }}>
            Mine favoritter
          </h2>
          <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.6, margin: '0 0 24px' }}>
            Log ind for at se de opskrifter du har gemt.
          </p>
          <Link href="/login?next=/mine-favoritter" style={{
            display: 'inline-block', padding: '10px 28px',
            background: '#61846D', color: '#fff', borderRadius: 24,
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
          }}>
            Log ind
          </Link>
        </div>
      </div>
    )
  }

  const favoritter = await fetchSavedRecipes(supabase, user.id).catch(() => new Set<string>())
  const antal = favoritter.size

  return (
    <div style={{ background: '#F8F3EE', minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #D4ADB6 0%, #D9BFC3 100%)',
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💝</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600,
          color: '#302218', margin: '0 0 10px',
        }}>
          Mine favoritter
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)', fontStyle: 'italic',
          color: '#302218', margin: '0 auto', maxWidth: 500,
          lineHeight: 1.55, opacity: 0.85,
        }}>
          De opskrifter du har gemt med et hjerte.
        </p>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '48px 24px 72px' }}>
        <div style={{
          background: '#FFFFFF', border: '1px solid #E5DDD9',
          borderRadius: 16, padding: '36px 32px', textAlign: 'center',
          boxShadow: '0 2px 10px rgba(48,34,24,.05)',
        }}>
          {antal === 0 ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>🤍</div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22, fontWeight: 600,
                color: '#302218', margin: '0 0 10px',
              }}>
                Ingen favoritter endnu
              </h2>
              <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.65, margin: '0 0 24px' }}>
                Find opskrifter du kan lide og tryk på hjertet — så samles de her.
              </p>
              <Link href="/opskrifter" style={{
                display: 'inline-block', padding: '10px 22px',
                background: '#61846D', color: '#fff', borderRadius: 24,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}>
                Udforsk opskrifter →
              </Link>
            </>
          ) : (
            <>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 48, fontWeight: 600,
                color: '#9B6272', lineHeight: 1, marginBottom: 8,
              }}>
                {antal}
              </div>
              <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 24px' }}>
                {antal === 1 ? 'gemt opskrift' : 'gemte opskrifter'}
              </p>
              <Link href="/opskrifter" style={{
                display: 'inline-block', padding: '10px 22px',
                background: '#61846D', color: '#fff', borderRadius: 24,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}>
                Se dine favoritter →
              </Link>
              <p style={{ fontSize: 12, color: '#8C7E74', margin: '20px 0 0', fontStyle: 'italic' }}>
                Du finder dem ved at filtrere på &quot;favoritter&quot; i opskrifts-oversigten.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
