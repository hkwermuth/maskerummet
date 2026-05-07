'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { resolveNext } from '@/lib/auth/resolveNext'
import GoogleLoginButton from '@/components/app/GoogleLoginButton'

const REMEMBERED_EMAIL_KEY = 'striq-email'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const supabase = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get('next')
  const nextPath = resolveNext(rawNext)
  // Bevar ?next= på kryds-link til signup hvis stien faktisk blev accepteret af whitelisten.
  const signupHref = rawNext && nextPath === rawNext ? `/signup?next=${encodeURIComponent(rawNext)}` : '/signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const errorParam = searchParams.get('error')
  const oauthError =
    errorParam === 'oauth_account_exists'
      ? 'Denne e-mail er allerede oprettet med adgangskode. Log ind med adgangskode for at fortsætte.'
      : null

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY)
    if (saved) setEmail(saved)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(nextPath)
    })
  }, [nextPath]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Forkert e-mail eller adgangskode.' : err.message)
      return
    }
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    router.push(nextPath)
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1px solid #D0C8BA', borderRadius: 8, fontSize: 14,
    background: '#F9F6F0', color: '#302218', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%',
  }

  if (showForgot) return <ForgotPasswordView onBack={() => setShowForgot(false)} />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ background: '#FFFCF7', borderRadius: 16, padding: '48px 40px', width: 380, maxWidth: '100%', boxShadow: '0 8px 40px rgba(48,34,24,.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧶</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: '#61846D', marginBottom: 6 }}>STRIQ</div>
          <div style={{ fontSize: 13, color: '#8C7E74' }}>Log ind for at åbne dit garnlager</div>
        </div>

        {oauthError && (
          <div role="alert" style={{ fontSize: 12, color: '#8B3A2A', background: '#F5E8E0', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            {oauthError}
          </div>
        )}

        <GoogleLoginButton nextPath={nextPath} mode="login" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }} aria-hidden="true">
          <div style={{ flex: 1, height: 1, background: '#D0C8BA' }} />
          <span style={{ fontSize: 11, color: '#8C7E74', textTransform: 'uppercase', letterSpacing: '.1em' }}>eller</span>
          <div style={{ flex: 1, height: 1, background: '#D0C8BA' }} />
        </div>

        <form onSubmit={signIn}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@email.dk" required autoComplete="email" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>Adgangskode</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#8B3A2A', background: '#F5E8E0', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
            <button type="submit" disabled={loading || !email || !password} style={{
              padding: 12, marginTop: 4,
              background: loading ? '#8C7E74' : '#61846D',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'background .15s',
            }}>
              {loading ? 'Logger ind...' : 'Log ind'}
            </button>
          </div>
        </form>

        <button onClick={() => setShowForgot(true)} style={{ marginTop: 16, width: '100%', background: 'transparent', border: 'none', color: '#8C7E74', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}>
          Glemt adgangskode?
        </button>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#8C7E74' }}>
          Ny bruger?{' '}
          <Link href={signupHref} style={{ color: '#61846D', textDecoration: 'underline', fontWeight: 500 }}>
            Opret konto
          </Link>
        </div>
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#8C7E74' }}>
          Din e-mail huskes automatisk til næste gang
        </div>
      </div>
    </div>
  )
}

function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const supabase = useSupabase()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message || 'Der skete en fejl. Prøv igen.'); return }
    setSent(true)
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1px solid #D0C8BA', borderRadius: 8, fontSize: 14,
    background: '#F9F6F0', color: '#302218', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%',
  }

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ background: '#FFFCF7', borderRadius: 16, padding: '48px 40px', width: 380, maxWidth: '100%', boxShadow: '0 8px 40px rgba(48,34,24,.12)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>✉️</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#61846D', marginBottom: 12 }}>Check din email</div>
        <div style={{ fontSize: 13, color: '#8C7E74', lineHeight: 1.6, marginBottom: 24 }}>
          Vi har sendt et link til <strong>{email}</strong> hvor du kan nulstille din adgangskode.
        </div>
        <button onClick={onBack} style={{ padding: '12px 24px', background: '#61846D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Tilbage til login
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ background: '#FFFCF7', borderRadius: 16, padding: '48px 40px', width: 380, maxWidth: '100%', boxShadow: '0 8px 40px rgba(48,34,24,.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: '#61846D', marginBottom: 6 }}>Nulstil adgangskode</div>
          <div style={{ fontSize: 13, color: '#8C7E74' }}>Indtast din email-adresse</div>
        </div>
        <form onSubmit={handleReset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@email.dk" required autoComplete="email" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#8B3A2A', background: '#F5E8E0', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
            <button type="submit" disabled={loading || !email} style={{ padding: 12, marginTop: 4, background: loading ? '#8C7E74' : '#61846D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {loading ? 'Sender...' : 'Send nulstillings-link'}
            </button>
          </div>
        </form>
        <button onClick={onBack} style={{ marginTop: 20, width: '100%', background: 'transparent', border: 'none', color: '#8C7E74', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}>
          Tilbage til login
        </button>
      </div>
    </div>
  )
}
