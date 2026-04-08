import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Garnlager from './components/Garnlager'
import Ideeboard from './components/Ideeboard'
import Arkiv from './components/Arkiv'
import FindGarn from './components/FindGarn'
import YarnVisualizer from './components/YarnVisualizer'
import Auth from './components/Auth'
import ResetPassword from './components/ResetPassword'

const TABS = [
  { id: 'hjem',       label: 'Hjem' },
  { id: 'garnlager',  label: 'Garnlager' },
  { id: 'arkiv',      label: 'Færdige projekter' },
  { id: 'findgarn',   label: 'Find garn' },
  { id: 'visualizer', label: 'Prøv garn' },
  { id: 'ideer',      label: 'Idéer' },
  { id: 'garnkatalog', label: 'Garn-katalog', href: import.meta.env.DEV ? 'http://localhost:3210/garn' : '/garn', external: true },
]

const FEATURES = [
  {
    id: 'garnlager',
    title: 'Garnlager',
    desc: 'Hold styr på hele dit garnlager. Scan stregkoder, søg på farve og fiber, og se hvad du har på lager.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="28" rx="16" ry="12" fill="#D0E8D4" />
        <ellipse cx="24" cy="24" rx="14" ry="10" fill="#E8E0D4" />
        <path d="M10 24c0-5.5 6.3-10 14-10s14 4.5 14 10" stroke="#2C4A3E" strokeWidth="2" fill="none"/>
        <path d="M14 20c2-3 5.5-5 10-5s8 2 10 5" stroke="#C16B47" strokeWidth="1.5" fill="none"/>
        <path d="M16 17c2-2 4.5-3.5 8-3.5s6 1.5 8 3.5" stroke="#8B7D6B" strokeWidth="1" fill="none"/>
        <ellipse cx="24" cy="24" rx="3" ry="2" fill="#FFFCF7" stroke="#C0B8A8" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'arkiv',
    title: 'Færdige projekter',
    desc: 'Gem dine færdige strikkeprojekter med billeder, garnforbrug og opskrifter — dit personlige arkiv.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="10" width="32" height="28" rx="4" fill="#E8E0D4" stroke="#2C4A3E" strokeWidth="2"/>
        <rect x="12" y="14" width="24" height="14" rx="2" fill="#D0E8D4"/>
        <path d="M12 14l12 8 12-8" stroke="#2C4A3E" strokeWidth="1.5" fill="none"/>
        <line x1="16" y1="32" x2="32" y2="32" stroke="#C0B8A8" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="36" x2="28" y2="36" stroke="#C0B8A8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'findgarn',
    title: 'Find garn',
    desc: 'Find butikker i nærheden der sælger dit yndlingsgarn. Søg på mærke og se dem på et kort.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="20" r="10" fill="#D0E8D4" stroke="#2C4A3E" strokeWidth="2"/>
        <circle cx="24" cy="20" r="4" fill="#FFFCF7" stroke="#C16B47" strokeWidth="2"/>
        <path d="M24 30l-6 12h12l-6-12z" fill="#E8E0D4" stroke="#2C4A3E" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'visualizer',
    title: 'Prøv garn',
    desc: 'Upload et foto af et strikkeprojekt og se hvordan det ser ud i nye farver — AI-drevet visualisering.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="10" width="36" height="28" rx="4" fill="#E8E0D4" stroke="#2C4A3E" strokeWidth="2"/>
        <rect x="10" y="14" width="12" height="10" rx="2" fill="#D0E8D4"/>
        <rect x="26" y="14" width="12" height="10" rx="2" fill="#F0A0B0" opacity=".6"/>
        <path d="M22 19l4 0" stroke="#C16B47" strokeWidth="2" strokeLinecap="round"/>
        <path d="M23 17l2 2-2 2" stroke="#C16B47" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="16" cy="32" r="3" fill="#C16B47"/>
        <circle cx="24" cy="32" r="3" fill="#8B7D6B"/>
        <circle cx="32" cy="32" r="3" fill="#D8D0E8"/>
      </svg>
    ),
  },
  {
    id: 'garnkatalog',
    title: 'Garn-katalog',
    href: import.meta.env.DEV ? 'http://localhost:3210/garn' : '/garn',
    external: true,
    desc: 'Udforsk vores katalog over garner med fibre, tykkelse, pleje, pinde og farver.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="8" width="10" height="32" rx="1.5" fill="#E8E0D4" stroke="#2C4A3E" strokeWidth="1.5"/>
        <rect x="18" y="8" width="10" height="32" rx="1.5" fill="#D0E8D4" stroke="#2C4A3E" strokeWidth="1.5"/>
        <rect x="30" y="8" width="10" height="32" rx="1.5" fill="#FFE0C4" stroke="#2C4A3E" strokeWidth="1.5"/>
        <line x1="8" y1="14" x2="14" y2="14" stroke="#C16B47" strokeWidth="1.2"/>
        <line x1="8" y1="18" x2="14" y2="18" stroke="#8B7D6B" strokeWidth="1"/>
        <line x1="20" y1="14" x2="26" y2="14" stroke="#C16B47" strokeWidth="1.2"/>
        <line x1="20" y1="18" x2="26" y2="18" stroke="#8B7D6B" strokeWidth="1"/>
        <line x1="32" y1="14" x2="38" y2="14" stroke="#C16B47" strokeWidth="1.2"/>
        <line x1="32" y1="18" x2="38" y2="18" stroke="#8B7D6B" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'ideer',
    title: 'Idéer',
    desc: 'Saml inspiration til kommende projekter på dit eget idébræt. Organiser med kolonner og flyt rundt.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="8" width="12" height="32" rx="3" fill="#D0E8D4" stroke="#2C4A3E" strokeWidth="1.5"/>
        <rect x="18" y="8" width="12" height="32" rx="3" fill="#FFE0C4" stroke="#2C4A3E" strokeWidth="1.5"/>
        <rect x="32" y="8" width="12" height="32" rx="3" fill="#D8D0E8" stroke="#2C4A3E" strokeWidth="1.5"/>
        <rect x="6" y="12" width="8" height="6" rx="1.5" fill="#FFFCF7"/>
        <rect x="6" y="20" width="8" height="4" rx="1.5" fill="#FFFCF7"/>
        <rect x="20" y="12" width="8" height="8" rx="1.5" fill="#FFFCF7"/>
        <rect x="34" y="12" width="8" height="5" rx="1.5" fill="#FFFCF7"/>
        <rect x="34" y="19" width="8" height="6" rx="1.5" fill="#FFFCF7"/>
      </svg>
    ),
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('hjem')
  const [session, setSession] = useState(undefined) // undefined = loading
  const [isResetPasswordPage, setIsResetPasswordPage] = useState(false)

  useEffect(() => {
    // Check if we're on reset password page
    const checkResetPasswordHash = () => {
      const hash = window.location.hash
      const search = window.location.search

      // Check for reset password route or recovery token in URL
      const isResetPasswordRoute = hash.includes('/reset-password')
      const isRecoveryToken = hash.includes('type=recovery') || search.includes('type=recovery')

      if (isResetPasswordRoute || isRecoveryToken) {
        setIsResetPasswordPage(true)
        console.log('✓ Reset password page detected')
      } else {
        setIsResetPasswordPage(false)
      }
    }

    // Check immediately on mount
    checkResetPasswordHash()

    // Listen for hash changes
    window.addEventListener('hashchange', checkResetPasswordHash)
    window.addEventListener('popstate', checkResetPasswordHash)

    return () => {
      window.removeEventListener('hashchange', checkResetPasswordHash)
      window.removeEventListener('popstate', checkResetPasswordHash)
    }
  }, [])

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth state changes (magic link callback, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Supabase fires PASSWORD_RECOVERY when user clicks reset email link
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordPage(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Reset password page — show password reset screen (before checking session)
  // This ensures password reset is shown even if a session was auto-established
  if (isResetPasswordPage) {
    return <ResetPassword onBack={() => {
      setIsResetPasswordPage(false)
      window.location.hash = ''
    }} />
  }

  // Loading state while Supabase resolves the session
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F4EFE6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif", color: '#8B7D6B', fontSize: '14px',
      }}>
        <span>Indlæser...</span>
      </div>
    )
  }

  // Not logged in — show login screen
  if (!session) {
    return <Auth />
  }

  const user = session.user

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh' }}>

      {/* Top nav */}
      <nav style={{
        background: '#2C4A3E',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        height: '60px',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '22px', fontWeight: 600, color: '#EDF5F0',
          letterSpacing: '.02em', marginRight: '20px', paddingBottom: '14px',
          flexShrink: 0,
        }}>
          STRIQ
        </div>

        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const tabStyle = {
            background: isActive ? '#F4EFE6' : 'transparent',
            color: isActive ? '#2C4A3E' : '#9ABFB0',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: isActive ? 500 : 400,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            letterSpacing: '.02em',
            transition: 'background .15s, color .15s',
            textDecoration: 'none',
            display: 'inline-block',
          }
          if (tab.external) {
            return (
              <a key={tab.id} href={tab.href} target="_blank" rel="noopener noreferrer" style={tabStyle}>
                {tab.label}
              </a>
            )
          }
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle}>
              {tab.label}
            </button>
          )
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User info + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#7ABDA0', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
              borderRadius: '5px', padding: '4px 10px', fontSize: '11px',
              color: '#9ABFB0', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Log ud
          </button>
        </div>
      </nav>

      {/* Content */}
      {activeTab === 'hjem' && (
        <div style={{ background: '#F4EFE6', minHeight: 'calc(100vh - 60px)' }}>
          {/* Hero */}
          <div style={{
            textAlign: 'center', padding: '56px 20px 40px',
            background: 'linear-gradient(180deg, #E8F0EB 0%, #F4EFE6 100%)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧶</div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 36, fontWeight: 600, color: '#2C4A3E',
              margin: '0 0 8px', letterSpacing: '.01em',
            }}>
              Velkommen til STRIQ
            </h1>
            <p style={{
              fontSize: 15, color: '#5A4E42', margin: 0,
              maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
              lineHeight: 1.5,
            }}>
              Dit personlige garnunivers — hold styr på dit lager, find inspiration og prøv nye farver
            </p>
          </div>

          {/* Feature cards */}
          <div style={{
            maxWidth: 900, margin: '0 auto', padding: '0 20px 60px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 16,
          }}>
            {FEATURES.map(f => {
              const cardStyle = {
                background: '#FFFCF7', border: '1px solid #E8E0D4',
                borderRadius: 16, padding: '28px 24px',
                textAlign: 'left', cursor: 'pointer',
                transition: 'transform .15s, box-shadow .15s',
                boxShadow: '0 1px 4px rgba(44,32,24,.06)',
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex', flexDirection: 'column', gap: 12,
                textDecoration: 'none', color: 'inherit',
              }
              const hoverProps = {
                onMouseEnter: e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(44,32,24,.12)' },
                onMouseLeave: e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.06)' },
              }
              const Tag = f.external ? 'a' : 'button'
              const tagProps = f.external
                ? { href: f.href, target: '_blank', rel: 'noopener noreferrer' }
                : { onClick: () => setActiveTab(f.id) }
              return (
              <Tag
                key={f.id}
                {...tagProps}
                style={cardStyle}
                {...hoverProps}
              >
                <div>{f.icon}</div>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20, fontWeight: 600, color: '#2C4A3E',
                  margin: 0,
                }}>
                  {f.title}
                </h3>
                <p style={{
                  fontSize: 13, color: '#5A4E42', margin: 0,
                  lineHeight: 1.5,
                }}>
                  {f.desc}
                </p>
                <span style={{
                  fontSize: 12, color: '#C16B47', fontWeight: 500,
                  marginTop: 'auto', paddingTop: 4,
                }}>
                  Åbn →
                </span>
              </Tag>
            )})}
          </div>
        </div>
      )}
      {activeTab === 'garnlager' && <Garnlager user={user} />}
      {activeTab === 'arkiv'     && <Arkiv user={user} />}
      {activeTab === 'findgarn'  && <FindGarn />}
      {activeTab === 'visualizer' && <YarnVisualizer user={user} />}
      {activeTab === 'ideer'     && <Ideeboard user={user} />}
    </div>
  )
}
