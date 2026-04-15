import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    })
    setLoading(false)

    if (err) {
      setError(err.message || 'Der skete en fejl. Prøv igen.')
      return
    }

    setSent(true)
  }

  if (sent) {
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
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>✉️</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '24px', fontWeight: 600, color: '#2C4A3E', marginBottom: '12px',
          }}>
            Check din email
          </div>
          <div style={{ fontSize: '13px', color: '#8B7D6B', lineHeight: '1.6', marginBottom: '24px' }}>
            Vi har sendt et link til <strong>{email}</strong> hvor du kan nulstille din adgangskode.
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
            Tilbage til login
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
            Nulstil adgangskode
          </div>
          <div style={{ fontSize: '13px', color: '#8B7D6B' }}>
            Indtast din email-adresse
          </div>
        </div>

        <form onSubmit={handleReset}>
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
              disabled={loading || !email}
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
              {loading ? 'Sender...' : 'Send nulstillings-link'}
            </button>
          </div>
        </form>

        <button
          onClick={onBack}
          style={{
            marginTop: '20px', width: '100%',
            background: 'transparent', border: 'none',
            color: '#8B7D6B', fontSize: '12px', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline',
          }}
        >
          Tilbage til login
        </button>
      </div>
    </div>
  )
}
