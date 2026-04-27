'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { buildLoginHref } from '@/lib/auth/buildLoginHref'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'

const NAV_LINKS = [
  { href: '/',               label: 'Hjem' },
  { href: '/garnlager',      label: 'Garnlager' },
  { href: '/projekter',      label: 'Projekter' },
  { href: '/garn',           label: 'Garn-katalog' },
  { href: '/find-forhandler',label: 'Find forhandler' },
  { href: '/opskrifter',     label: 'Opskrifter' },
  { href: '/faellesskabet',  label: 'Fællesskabet' },
  { href: '/om-striq',       label: 'Om Striq' },
]

export function Nav({ onRequestLogin }: { onRequestLogin?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditor, setIsEditor] = useState<boolean>(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const handleLoginClick = onRequestLogin ?? (() => router.push(buildLoginHref(pathname)))
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  useEffect(() => {
    const refreshEditor = async (u: User | null) => {
      if (!u) { setIsEditor(false); return }
      const { data, error } = await supabase.rpc('is_editor')
      // RPC-fejl → skjul admin-link (UX, ikke sikkerhed; pages har egen guard)
      setIsEditor(error ? false : Boolean(data))
    }
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); refreshEditor(data.user) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      refreshEditor(u)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleLinks = isEditor
    ? [...NAV_LINKS, { href: '/garn/admin', label: 'Admin' }]
    : NAV_LINKS

  // Luk drawer ved navigation
  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEscapeKey(menuOpen, () => setMenuOpen(false))

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(244, 239, 230, 0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(48,34,24,0.08)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          height: '58px',
          boxShadow: '0 1px 10px rgba(48,34,24,.08)',
          overflow: 'visible',
        }}
      >
        {/* Burger (kun mobil) */}
        <button
          type="button"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Luk menu' : 'Åbn menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="md:hidden"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            marginRight: 4,
            background: 'transparent',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#302218',
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <>
                <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>

        {/* Logo */}
        <Link
          href="/"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 12px 0 4px', flexShrink: 0,
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Striq — gå til forsiden"
        >
          <img
            src="/brand/striq-logo-sort-rosa-beskaaret.png"
            alt="Striq"
            style={{ height: 'clamp(18px, 3.7vw, 32px)', width: 'auto', display: 'block' }}
          />
        </Link>

        {/* Nav-tabs (desktop) */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 2, flexWrap: 'nowrap' }}>
          {visibleLinks.map(link => {
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
        </div>

        <div style={{ flex: 1 }} />

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {user ? (
            <>
              <span
                className="hidden sm:inline"
                style={{
                  fontSize: '12px', color: 'rgba(48,34,24,0.60)',
                  maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  minHeight: 36,
                  background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(48,34,24,0.15)',
                  borderRadius: '20px', padding: '6px 14px', fontSize: '12.5px',
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
                minHeight: 36,
                background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(48,34,24,0.15)',
                borderRadius: '20px', padding: '6px 14px', fontSize: '12.5px',
                color: '#302218', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              }}
            >
              Log ind
            </button>
          )}
        </div>
      </nav>

      {/* Mobil-drawer */}
      {menuOpen && (
        <div
          className="md:hidden"
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', top: 58, left: 0, right: 0, bottom: 0,
            background: 'rgba(30,18,12,0.45)',
            zIndex: 99,
          }}
        >
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(244, 239, 230, 0.98)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '12px 16px 20px',
              borderBottom: '1px solid rgba(48,34,24,0.08)',
              boxShadow: '0 6px 20px rgba(48,34,24,.12)',
              maxHeight: 'calc(100vh - 58px)',
              overflowY: 'auto',
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {visibleLinks.map(link => {
                const active = isActive(link.href)
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: 48,
                        padding: '10px 14px',
                        borderRadius: 10,
                        fontSize: 15,
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: active ? 500 : 400,
                        color: active ? '#302218' : 'rgba(48,34,24,0.82)',
                        background: active ? 'rgba(255,255,255,0.55)' : 'transparent',
                        border: active ? '1px solid rgba(48,34,24,0.08)' : '1px solid transparent',
                        textDecoration: 'none',
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {user && (
              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: '1px solid rgba(48,34,24,0.1)',
                fontSize: 12, color: 'rgba(48,34,24,0.6)',
                wordBreak: 'break-all',
              }}>
                Logget ind som {user.email}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
