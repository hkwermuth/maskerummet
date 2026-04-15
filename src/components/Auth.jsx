import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ForgotPassword from './ForgotPassword'

const REMEMBERED_EMAIL_KEY = 'striq-email'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // Pre-fill remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY)
    if (saved) setEmail(saved)
  }, [])

  async function signIn(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Forkert e-mail eller adgangskode.'
          : err.message
      )
      return
    }

    // Remember email for next time
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
  }

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: '20px',
    }}>
      <div style={{
        background: '#FFFCF7', borderRadius: '16px',
        padding: '48px 40px', width: '380px', maxWidth: '100%',
        boxShadow: '0 8px 40px rgba(44,32,24,.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧶</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px', fontWeight: 600, color: '#2C4A3E', marginBottom: '6px',
          }}>
            STRIQ
          </div>
          <div style={{ fontSize: '13px', color: '#8B7D6B' }}>
            Log ind for at åbne dit garnlager
          </div>
        </div>

        <form onSubmit={signIn}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="din@email.dk"
                required
                autoComplete="email"
                style={{
                  padding: '10px 12px', border: '1px solid #D0C8BA',
                  borderRadius: '8px', fontSize: '14px',
                  background: '#F9F6F0', color: '#2C2018',
                  fontFamily: "'DM Sans', sans-serif", outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>
                Adgangskode
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  padding: '10px 12px', border: '1px solid #D0C8BA',
                  borderRadius: '8px', fontSize: '14px',
                  background: '#F9F6F0', color: '#2C2018',
                  fontFamily: "'DM Sans', sans-serif", outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                fontSize: '12px', color: '#8B3A2A',
                background: '#F5E8E0', borderRadius: '6px', padding: '8px 12px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                padding: '12px', marginTop: '4px',
                background: loading ? '#8AAAA0' : '#2C4A3E',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 500,
                cursor: loading ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background .15s',
              }}
            >
              {loading ? 'Logger ind...' : 'Log ind'}
            </button>
          </div>
        </form>

        <button
          onClick={() => setShowForgotPassword(true)}
          style={{
            marginTop: '16px', width: '100%',
            background: 'transparent', border: 'none',
            color: '#8B7D6B', fontSize: '12px', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline',
          }}
        >
          Glemt adgangskode?
        </button>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#B0A090' }}>
          Din e-mail huskes automatisk til næste gang
        </div>
      </div>
    </div>
  )
}
