import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Garnlager from './components/Garnlager'
import Ideeboard from './components/Ideeboard'
import Arkiv from './components/Arkiv'
import FindGarn from './components/FindGarn'
import YarnVisualizer from './components/YarnVisualizer'
import Auth from './components/Auth'
import ResetPassword from './components/ResetPassword'
import Faq from './components/Faq'
import BackgroundCarousel from './components/BackgroundCarousel'
import Strikkeskolen from './components/Strikkeskolen'
import Opskrifter from './components/Opskrifter'
import Kalender from './components/Kalender'
import OmStriq from './components/OmStriq'

// Design tokens (Lovable / Smuksak-paletten)
const C = {
  bg:        '#F8F3EE',
  cardBg:    '#FFFFFF',
  navBg:     '#D4ADB6',
  navText:   '#302218',
  text:      '#302218',
  textMuted: '#8C7E74',
  sage:      '#61846D',
  dustyPink: '#D4ADB6',
  accent:    '#D9BFC3',
  border:    '#E5DDD9',
  link:      '#9B6272',
  footerBg:  '#E8DADC',
}

const NAV_TABS = [
  { id: 'hjem',          label: 'Hjem' },
  { id: 'garnlager',     label: 'Garnlager' },
  { id: 'opskrifter',    label: 'Opskrifter' },
  { id: 'strikkeskolen', label: 'Strikkeskolen' },
  { id: 'findgarn',      label: 'Find forhandler' },
  { id: 'om-striq',      label: 'Om STRIQ' },
]

const ALL_TABS = [
  'hjem','garnlager','arkiv','findgarn','visualizer',
  'opskrifter','strikkeskolen','kalender','om-striq','ideer','faq',
]

const FEATURES = [
  {
    id: 'garnlager', title: 'Mit garnlager', accent: '#61846D',
    desc: 'Hold styr på hele dit garnlager — søg på farve, fiber og se hvad du har på lager.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="15" rx="9" ry="5"/><path d="M3 10c0-2.8 4-5 9-5s9 2.2 9 5"/><path d="M3 10v5M21 10v5"/><circle cx="12" cy="10" r="1.2" fill="#61846D" stroke="none"/></svg>,
  },
  {
    id: 'arkiv', title: 'Mine projekter', accent: '#D4ADB6',
    desc: 'Gem dine strikkeprojekter med billeder, noter og opskrifter — dit personlige arkiv.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  },
  {
    id: 'kalender', title: 'Kalender', accent: '#D9BFC3',
    desc: 'Find kommende strikke-events, workshops og meetups i dit område.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="0.8" fill="#9B6272"/><circle cx="12" cy="15" r="0.8" fill="#9B6272"/><circle cx="16" cy="15" r="0.8" fill="#9B6272"/></svg>,
  },
  {
    id: 'garnkatalog', title: 'Find garn', accent: '#61846D',
    href: import.meta.env.DEV ? 'http://localhost:3210/garn' : '/garn',
    external: true,
    desc: 'Udforsk vores garnkatalog — søg på fiber, tykkelse, farve og mærke.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>,
  },
  {
    id: 'visualizer', title: 'Prøv farven med AI', accent: '#D4ADB6',
    desc: 'Upload et foto og se hvordan dit projekt ser ud i nye farver — AI-drevet visualisering.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/><path d="M19 3v4M17 5h4"/></svg>,
  },
  {
    id: 'strikkeskolen', title: 'Strikkeskolen', accent: '#D9BFC3',
    desc: 'Lær nye teknikker med videoguides, FAQ og trin-for-trin instruktioner.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
  {
    id: 'opskrifter', title: 'Opskrifter', accent: '#61846D',
    desc: 'Browse vores samling af strikkeopskrifter — fra begynder til avanceret.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg>,
  },
  {
    id: 'findgarn', title: 'Find forhandler', accent: '#D4ADB6',
    desc: 'Find butikker i nærheden der sælger dit yndlingsgarn — se dem på et kort.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('hjem')
  const [session, setSession] = useState(undefined)
  const [isResetPasswordPage, setIsResetPasswordPage] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    const check = () => {
      const hash = window.location.hash
      const search = window.location.search
      const isReset = hash.includes('/reset-password') || hash.includes('type=recovery') || search.includes('type=recovery')
      setIsResetPasswordPage(isReset)
    }
    check()
    window.addEventListener('hashchange', check)
    window.addEventListener('popstate', check)
    return () => { window.removeEventListener('hashchange', check); window.removeEventListener('popstate', check) }
  }, [])

  useEffect(() => {
    const sync = () => {
      if (isResetPasswordPage) return
      const hash = (window.location.hash ?? '').toLowerCase()
      const params = new URLSearchParams(window.location.search ?? '')
      const tab = params.get('tab')?.toLowerCase() || (hash.startsWith('#') ? hash.slice(1) : '')
      if (ALL_TABS.includes(tab)) setActiveTab(tab)
    }
    sync()
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync) }
  }, [isResetPasswordPage])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') setIsResetPasswordPage(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close auth modal when user logs in
  useEffect(() => {
    if (session?.user) setShowAuth(false)
  }, [session])

  const navigate = (id) => {
    setActiveTab(id)
    try { window.location.hash = '#' + id } catch {}
  }

  if (isResetPasswordPage) {
    return <ResetPassword onBack={() => { setIsResetPasswordPage(false); window.location.hash = '' }} />
  }
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#8C7E74', fontSize: 14 }}>
        Indlaerer...
      </div>
    )
  }
  const user = session?.user ?? null
  const bgBase = import.meta.env.DEV ? 'https://maskerummet.vercel.app' : ''

  const onRequestLogin = () => setShowAuth(true)

  return (
    <div style={{ position: 'relative', fontFamily: 'DM Sans, sans-serif', minHeight: '100vh', background: '#F8F3EE' }}>

      {/* Login modal overlay */}
      {showAuth && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(30,18,12,0.55)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
        onClick={e => { if (e.target === e.currentTarget) setShowAuth(false) }}
        >
          <div style={{ position: 'relative', maxWidth: 440, width: '90%' }}>
            <button
              onClick={() => setShowAuth(false)}
              style={{
                position: 'absolute', top: -12, right: -12, zIndex: 1,
                width: 32, height: 32, borderRadius: '50%',
                background: '#fff', border: '1px solid #E5DDD9',
                cursor: 'pointer', fontSize: 18, color: '#8C7E74',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,.12)',
              }}
            >&times;</button>
            <Auth />
          </div>
        </div>
      )}

      <BackgroundCarousel
        images={[
          bgBase + '/garn/backgrounds/baggrund_1.JPG',
          bgBase + '/garn/backgrounds/baggrund_2.JPEG.JPG',
          bgBase + '/garn/backgrounds/baggrund_3.JPG',
        ]}
        overlay={
          activeTab === 'hjem'
            ? 'linear-gradient(180deg, rgba(30,18,12,0.38) 0%, rgba(30,18,12,0.52) 100%)'
            : 'linear-gradient(180deg, rgba(30,18,12,0.18) 0%, rgba(30,18,12,0.28) 100%)'
        }
      />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Navigation */}
        <nav style={{
          background: 'rgba(244, 239, 230, 0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(48,34,24,0.08)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          height: '58px',
          boxShadow: '0 1px 10px rgba(48,34,24,.08)',
          overflow: 'visible',
        }}>
          <button
            onClick={() => navigate('hjem')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 18px 0 0', flexShrink: 0, display: 'flex', alignItems: 'center', overflow: 'visible' }}
          >
            <img
              src="/brand/striq-logo-sort-rosa-beskaaret.png"
              alt="STRIQ"
              style={{
                height: 'clamp(16px, 3.7vw, 32px)',
                width: 'auto',
                display: 'block',
                marginTop: 0,
              }}
            />
          </button>

          {NAV_TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => navigate(tab.id)} style={{
                background: isActive ? 'rgba(244, 239, 230, 0.72)' : 'transparent',
                backdropFilter: isActive ? 'blur(10px)' : 'none',
                WebkitBackdropFilter: isActive ? 'blur(10px)' : 'none',
                color: isActive ? '#302218' : 'rgba(48,34,24,0.72)',
                border: isActive ? '1px solid rgba(48,34,24,0.08)' : '1px solid transparent',
                borderRadius: '999px',
                padding: '7px 14px',
                fontSize: '13.5px', fontWeight: isActive ? 500 : 400,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                letterSpacing: '.01em', transition: 'background .15s, color .15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(244, 239, 230, 0.42)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >{tab.label}</button>
            )
          })}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {user ? (
              <>
                <span style={{ fontSize: '12px', color: 'rgba(48,34,24,0.60)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
                <button onClick={() => supabase.auth.signOut()} style={{
                  background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(48,34,24,0.15)',
                  borderRadius: '20px', padding: '5px 14px', fontSize: '12.5px',
                  color: '#302218', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)' }}
                >Log ud</button>
              </>
            ) : (
              <button onClick={onRequestLogin} style={{
                background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(48,34,24,0.15)',
                borderRadius: '20px', padding: '5px 14px', fontSize: '12.5px',
                color: '#302218', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)' }}
              >Log ind</button>
            )}
          </div>
        </nav>

        {/* Forside */}
        {activeTab === 'hjem' && (
          <div style={{ minHeight: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column' }}>

            {/* Hero */}
            <div style={{ textAlign: 'center', padding: '54px 20px 50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <img
                src="/brand/striq-logo-creme-rosa-traad-3d-transparent.png"
                alt="STRIQ"
                style={{
                  height: 'clamp(96px, 22vw, 170px)',
                  width: 'auto',
                  maxWidth: '92vw',
                  filter: 'drop-shadow(0 3px 18px rgba(0,0,0,0.28))',
                }}
              />
              <h1 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600,
                color: '#FFFCF7', margin: 0, letterSpacing: '.02em',
                textShadow: '0 2px 16px rgba(0,0,0,0.30)',
              }}>
                Dit strikke-univers
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,252,247,0.88)', margin: 0, maxWidth: 520, lineHeight: 1.65, textShadow: '0 1px 8px rgba(0,0,0,0.20)' }}>
                Hold styr på dit garnlager, gem dine projekter, find inspiration og prøv nye farver — alt samlet et sted.
              </p>
            </div>

            {/* Kort-grid */}
            <div style={{ background: '#F8F3EE', flex: 1, padding: '40px 24px 64px' }}>
              <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
                {FEATURES.map(f => {
                  const Tag = f.external ? 'a' : 'button'
                  const tagProps = f.external
                    ? { href: f.href, target: '_blank', rel: 'noopener noreferrer' }
                    : { onClick: () => navigate(f.id) }
                  return (
                    <Tag key={f.id} {...tagProps} style={{
                      background: '#FFFFFF', border: '1px solid #E5DDD9',
                      borderLeft: '4px solid ' + f.accent,
                      borderRadius: '12px', padding: '24px 20px 20px',
                      textAlign: 'left', cursor: 'pointer',
                      transition: 'transform .15s, box-shadow .15s',
                      boxShadow: '0 1px 4px rgba(48,34,24,.06)',
                      fontFamily: 'DM Sans, sans-serif',
                      display: 'flex', flexDirection: 'column', gap: 10,
                      textDecoration: 'none', color: 'inherit',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(48,34,24,.11)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(48,34,24,.06)' }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F8F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {f.icon}
                      </div>
                      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 600, color: '#302218', margin: 0 }}>
                        {f.title}
                      </h3>
                      <p style={{ fontSize: 13, color: '#8C7E74', margin: 0, lineHeight: 1.55 }}>
                        {f.desc}
                      </p>
                      <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto', paddingTop: 4 }}>
                        Abn &rarr;
                      </span>
                    </Tag>
                  )
                })}
              </div>
            </div>

            <footer style={{ background: '#E8DADC', textAlign: 'center', padding: '18px 20px', fontSize: 12.5, color: '#8C7E74', borderTop: '1px solid #E5DDD9' }}>
              &copy; 2026 STRIQ &mdash; Dit personlige garnunivers
            </footer>
          </div>
        )}

        {activeTab === 'garnlager'     && <Garnlager user={user} onRequestLogin={onRequestLogin} />}
        {activeTab === 'arkiv'         && <Arkiv user={user} onRequestLogin={onRequestLogin} />}
        {activeTab === 'findgarn'      && <FindGarn />}
        {activeTab === 'visualizer'    && <YarnVisualizer user={user} onRequestLogin={onRequestLogin} />}
        {activeTab === 'faq'           && <Faq />}
        {activeTab === 'ideer'         && <Ideeboard user={user} onRequestLogin={onRequestLogin} />}
        {activeTab === 'opskrifter'    && <Opskrifter onNavigate={navigate} />}
        {activeTab === 'strikkeskolen' && <Strikkeskolen onNavigate={navigate} />}
        {activeTab === 'kalender'      && <Kalender onNavigate={navigate} />}
        {activeTab === 'om-striq'      && <OmStriq onNavigate={navigate} />}

      </div>
    </div>
  )
}
