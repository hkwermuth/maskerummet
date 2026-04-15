import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword({ onBack }) {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const establishSession = async () => {
      console.log('=== ResetPassword: Establishing session ===')
      console.log('URL hash:', window.location.hash)
      console.log('URL search:', window.location.search)
      console.log('Full URL:', window.location.href)

      // 1. Check if SDK already has a session (auto-detected from URL)
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Existing session:', session ? 'YES' : 'NO')

      if (session) {
        console.log('Session found — ready to update password')
        setSessionReady(true)
        setInitializing(false)
        return
      }

      // 2. Try to manually parse tokens from URL
      const hash = window.location.hash
      const search = window.location.search

      // Extract tokens using regex (handles double-hash, single-hash, any format)
      const accessToken = hash.match(/access_token=([^&]+)/)?.[1]
                       || search.match(/access_token=([^&]+)/)?.[1]
      const refreshToken = hash.match(/refresh_token=([^&]+)/)?.[1]
                        || search.match(/refresh_token=([^&]+)/)?.[1]

      // Try PKCE code exchange (Supabase v2 may use this)
      const code = new URLSearchParams(search).get('code')

      console.log('Parsed tokens:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasCode: !!code,
      })

      if (accessToken && refreshToken) {
        console.log('Trying setSession with parsed tokens...')
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        console.log('setSession result:', { data: !!data?.session, error: error?.message })
        if (!error && data?.session) {
          setSessionReady(true)
          setInitializing(false)
          return
        }
      }

      if (code) {
        console.log('Trying exchangeCodeForSession with PKCE code...')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        console.log('exchangeCode result:', { data: !!data?.session, error: error?.message })
        if (!error && data?.session) {
          setSessionReady(true)
          setInitializing(false)
          return
        }
      }

      console.log('No tokens found — waiting for onAuthStateChange...')
      // Don't set error yet — onAuthStateChange might still fire
      setInitializing(false)
    }

    establishSession()

    // Also listen for PASSWORD_RECOVERY event as fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('onAuthStateChange event:', event, 'session:', !!session)
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        console.log('Session established via onAuthStateChange')
        setSessionReady(true)
        setInitializing(false)
      }
    })

    return () => subscription.unsubscribe()
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

    if (!sessionReady) {
      // Last attempt: check session one more time before giving up
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
      } else {
        setError('Ingen aktiv session. Prøv at klikke reset-linket fra din email igen.')
        return
      }
    }

    setLoading(true)

    try {
      console.log('Calling updateUser...')
      const { data, error } = await supabase.auth.updateUser({ password })
      console.log('updateUser result:', { data: !!data, error: error?.message })

      if (error) {
        throw error
      }

      console.log('Password updated successfully!')
      setSuccess(true)
    } catch (err) {
      console.error('Password update error:', err)
      setError(err.message || 'Der skete en fejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  // Loading while establishing session
  if (initializing) {
    return (
      <div style={{
        minHeight: '100vh', background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif", padding: '20px',
      }}>
        <div style={{
          background: '#FFFCF7', borderRadius: '16px',
          padding: '48px 40px', width: '380px', maxWidth: '100%',
          boxShadow: '0 8px 40px rgba(44,32,24,.12)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '20px', fontWeight: 600, color: '#2C4A3E', marginBottom: '12px',
          }}>
            Verificerer nulstillings-link
          </div>
          <div style={{ fontSize: '13px', color: '#8B7D6B', lineHeight: '1.6' }}>
            Venligst vent...
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', background: 'transparent',
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
          {!sessionReady && (
            <div style={{ fontSize: '11px', color: '#B0A090', marginTop: '8px' }}>
              Advarsel: Ingen session fundet. Tjek at du brugte linket fra din email.
            </div>
          )}
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
