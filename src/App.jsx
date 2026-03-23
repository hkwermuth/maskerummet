import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Garnlager from './components/Garnlager'
import Ideeboard from './components/Ideeboard'
import Arkiv from './components/Arkiv'
import FindGarn from './components/FindGarn'
import Auth from './components/Auth'

const TABS = [
  { id: 'garnlager', label: 'Garnlager' },
  { id: 'arkiv',     label: 'Færdige projekter' },
  { id: 'findgarn',  label: 'Find garn' },
  { id: 'ideer',     label: 'Idéer' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('garnlager')
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth state changes (magic link callback, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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
          Maskerummet
        </div>

        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? '#F4EFE6' : 'transparent',
              color: activeTab === tab.id ? '#2C4A3E' : '#9ABFB0',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 500 : 400,
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer',
              letterSpacing: '.02em',
              transition: 'background .15s, color .15s',
            }}
          >
            {tab.label}
          </button>
        ))}

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
      {activeTab === 'garnlager' && <Garnlager user={user} />}
      {activeTab === 'arkiv'     && <Arkiv user={user} />}
      {activeTab === 'findgarn'  && <FindGarn />}
      {activeTab === 'ideer'     && <Ideeboard user={user} />}
    </div>
  )
}
