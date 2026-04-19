'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const NAV_LINKS = [
  { href: '/',               label: 'Hjem' },
  { href: '/garnlager',      label: 'Garnlager' },
  { href: '/projekter',      label: 'Projekter' },
  { href: '/garn',           label: 'Garn-katalog' },
  { href: '/find-forhandler',label: 'Find forhandler' },
  { href: '/opskrifter',     label: 'Opskrifter' },
  { href: '/strikkeskolen',  label: 'Strikkeskolen' },
  { href: '/om-striq',       label: 'Om Striq' },
]

export function Nav({ onRequestLogin }: { onRequestLogin?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createSupabaseBrowserClient()

  const handleLoginClick = onRequestLogin ?? (() => router.push('/login'))
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
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
      {/* Logo */}
      <Link
        href="/"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 18px 0 0', flexShrink: 0, display: 'flex', alignItems: 'center' }}
        aria-label="Striq — gå til forsiden"
      >
        <img
          src="/brand/striq-logo-sort-rosa-beskaaret.png"
          alt="Striq"
          style={{ height: 'clamp(16px, 3.7vw, 32px)', width: 'auto', display: 'block' }}
        />
      </Link>

      {/* Nav-tabs */}
      {NAV_LINKS.map(link => {
        const active = isActive(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              background:         active ? 'rgba(244, 239, 230, 0.72)' : 'transparent',
              backdropFilter:     active ? 'blur(10px)' : 'none',
              WebkitBackdropFilter: active ? 'blur(10px)' : 'none',
              color:              active ? '#302218' : 'rgba(48,34,24,0.72)',
              border:             active ? '1px solid rgba(48,34,24,0.08)' : '1px solid transparent',
              borderRadius:       '999px',
              padding:            '7px 14px',
              fontSize:           '13.5px',
              fontWeight:         active ? 500 : 400,
              fontFamily:         "'DM Sans', sans-serif",
              cursor:             'pointer',
              letterSpacing:      '.01em',
              transition:         'background .15s, color .15s',
              whiteSpace:         'nowrap',
              textDecoration:     'none',
              display:            'inline-block',
            }}
          >
            {link.label}
          </Link>
        )
      })}

      <div style={{ flex: 1 }} />

      {/* Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {user ? (
          <>
            <span style={{ fontSize: '12px', color: 'rgba(48,34,24,0.60)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(48,34,24,0.15)',
                borderRadius: '20px', padding: '5px 14px', fontSize: '12.5px',
                color: '#302218', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              }}
            >
              Log ud
            </button>
          </>
        ) : (
          <button
            onClick={handleLoginClick}
            style={{
              background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(48,34,24,0.15)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '12.5px',
              color: '#302218', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            }}
          >
            Log ind
          </button>
        )}
      </div>
    </nav>
  )
}
