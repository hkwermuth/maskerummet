import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword({ onBack }) {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Check if user has recovery session (from reset email)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is in password recovery state
      }
    })
    return () => data?.subscription?.unsubscribe()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('Adgangskoderne stemmer ikke overens.')
      return
    }

    if (password.length < 6) {
      setError('Adgangskoden skal være mindst 6 tegn.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message || 'Der skete en fejl. Prøv igen.')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F4EFE6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif", padding: '20px',
      }}>
        <div style={{
          background: '#FFFCF7', borderRadius: '16px',
          padding: '48px 40px', width: '380px', maxWidth: '100%',
          boxShadow: '0 8px 40px rgba(44,32,24,.12)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '24px', fontWeight: 600, color: '#2C4A3E', marginBottom: '12px',
          }}>
            Adgangskode nulstillet
          </div>
          <div style={{ fontSize: '13px', color: '#8B7D6B', lineHeight: '1.6', marginBottom: '24px' }}>
            Din adgangskode er nu ændret. Du kan nu logge ind med din nye adgangskode.
          </div>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              background: '#2C4A3E',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Gå til login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F4EFE6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: '20px',
    }}>
      <div style={{
        background: '#FFFCF7', borderRadius: '16px',
        padding: '48px 40px', width: '380px', maxWidth: '100%',
        boxShadow: '0 8px 40px rgba(44,32,24,.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔐</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px', fontWeight: 600, color: '#2C4A3E', marginBottom: '6px',
          }}>
            Sæt ny adgangskode
          </div>
          <div style={{ fontSize: '13px', color: '#8B7D6B' }}>
            Vælg en sikker adgangskode
          </div>
        </div>

        <form onSubmit={handleReset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>
                Ny adgangskode
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
                Bekræft adgangskode
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
              disabled={loading || !password || !passwordConfirm}
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
              {loading ? 'Gemmer...' : 'Gem ny adgangskode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
