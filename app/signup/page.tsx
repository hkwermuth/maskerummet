'use client'

import { useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const supabase = useSupabase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Adgangskoden skal være mindst 6 tegn.')
      return
    }
    if (password !== confirmPassword) {
      setError('Adgangskoderne er ikke ens.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/garnlager`,
      },
    })
    setLoading(false)

    if (err) {
      if (err.message === 'User already registered') {
        setError('Der findes allerede en konto med denne e-mail.')
      } else {
        setError(err.message || 'Der skete en fejl. Prøv igen.')
      }
      return
    }

    setSent(true)
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1px solid #D0C8BA', borderRadius: 8, fontSize: 14,
    background: '#F9F6F0', color: '#302218', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%',
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
        <div style={{ background: '#FFFCF7', borderRadius: 16, padding: '48px 40px', width: 380, maxWidth: '100%', boxShadow: '0 8px 40px rgba(48,34,24,.12)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✉️</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#61846D', marginBottom: 12 }}>Tjek din e-mail</div>
          <div style={{ fontSize: 13, color: '#8C7E74', lineHeight: 1.6, marginBottom: 24 }}>
            Vi har sendt en bekræftelse til <strong>{email}</strong>. Klik på linket i mailen for at aktivere din konto.
          </div>
          <Link href="/login" style={{ display: 'inline-block', padding: '12px 24px', background: '#61846D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
            Gå til login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ background: '#FFFCF7', borderRadius: 16, padding: '48px 40px', width: 380, maxWidth: '100%', boxShadow: '0 8px 40px rgba(48,34,24,.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧶</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: '#61846D', marginBottom: 6 }}>Opret konto</div>
          <div style={{ fontSize: 13, color: '#8C7E74' }}>Kom i gang med dit personlige garnlager</div>
        </div>

        <form onSubmit={handleSignup}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@email.dk" required autoComplete="email" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>Adgangskode</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindst 6 tegn" required autoComplete="new-password" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>Bekræft adgangskode</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Gentag adgangskoden" required autoComplete="new-password" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#8B3A2A', background: '#F5E8E0', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
            <button type="submit" disabled={loading || !email || !password || !confirmPassword} style={{
              padding: 12, marginTop: 4,
              background: loading ? '#8C7E74' : '#61846D',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'background .15s',
            }}>
              {loading ? 'Opretter konto...' : 'Opret konto'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#8C7E74' }}>
          Har du allerede en konto?{' '}
          <Link href="/login" style={{ color: '#61846D', textDecoration: 'underline', fontWeight: 500 }}>
            Log ind
          </Link>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#8C7E74', lineHeight: 1.5 }}>
          Ved at oprette en konto accepterer du vores{' '}
          <Link href="/privatlivspolitik" style={{ color: '#8C7E74', textDecoration: 'underline' }}>
            privatlivspolitik
          </Link>
        </div>
      </div>
    </div>
  )
}
