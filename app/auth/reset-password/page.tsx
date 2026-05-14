'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    async function establishSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setSessionReady(true); setInitializing(false); return }

      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data?.session) { setSessionReady(true); setInitializing(false); return }
      }
      setInitializing(false)
    }
    establishSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true); setInitializing(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== passwordConfirm) { setError('Adgangskoderne stemmer ikke overens.'); return }
    if (password.length < 8) { setError('Adgangskoden skal være mindst 8 tegn.'); return }
    if (!sessionReady) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setSessionReady(true) } else {
        setError('Ingen aktiv session. Prøv at klikke reset-linket fra din email igen.')
        return
      }
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Der skete en fejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1px solid #D0C8BA', borderRadius: 8, fontSize: 14,
    background: '#F9F6F0', color: '#302218', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%',
  }
  const cardStyle: React.CSSProperties = { background: '#FFFCF7', borderRadius: 16, padding: '48px 40px', width: 380, maxWidth: '100%', boxShadow: '0 8px 40px rgba(48,34,24,.12)', textAlign: 'center' }
  const wrapStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }

  if (initializing) return (
    <div style={wrapStyle}><div style={cardStyle}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#61846D', marginBottom: 12 }}>Verificerer nulstillings-link</div>
      <div style={{ fontSize: 13, color: '#8C7E74', lineHeight: 1.6 }}>Venligst vent...</div>
    </div></div>
  )

  if (success) return (
    <div style={wrapStyle}><div style={cardStyle}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#61846D', marginBottom: 12 }}>Adgangskode nulstillet</div>
      <div style={{ fontSize: 13, color: '#8C7E74', lineHeight: 1.6, marginBottom: 24 }}>Din adgangskode er nu ændret. Du kan nu logge ind med din nye adgangskode.</div>
      <button onClick={() => router.push('/login')} style={{ padding: '12px 24px', background: '#61846D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        Gå til login
      </button>
    </div></div>
  )

  return (
    <div style={wrapStyle}>
      <div style={{ ...cardStyle, textAlign: 'left' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: '#61846D', marginBottom: 6 }}>Sæt ny adgangskode</div>
          <div style={{ fontSize: 13, color: '#8C7E74' }}>Vælg en sikker adgangskode</div>
          {!sessionReady && <div style={{ fontSize: 11, color: '#8C7E74', marginTop: 8 }}>Advarsel: Ingen session fundet. Tjek at du brugte linket fra din email.</div>}
        </div>
        <form onSubmit={handleReset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>Ny adgangskode</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>Bekræft adgangskode</label>
              <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="••••••••" required autoComplete="new-password" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#8B3A2A', background: '#F5E8E0', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
            <button type="submit" disabled={loading || !password || !passwordConfirm} style={{ padding: 12, marginTop: 4, background: loading ? '#8C7E74' : '#61846D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {loading ? 'Gemmer...' : 'Gem ny adgangskode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
