'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { buildLoginHref } from '@/lib/auth/buildLoginHref'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'

type SubItem = {
  href: string
  label: string
  comingSoon?: boolean
}

type NavLink = {
  href?: string
  label: string
  subitems?: SubItem[]
}

// Hver hub-side samler beslægtede undersider. subitems vises som dropdown
// på desktop (hover) og som indrykkede links i mobile drawer.
// Eksisterende ruter bevares — de er bare ikke topmenu-punkter længere.
const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Hjem' },
  {
    label: 'Mit STRIQ',
    subitems: [
      { href: '/garnlager',        label: 'Mit garn' },
      { href: '/projekter',        label: 'Mine projekter' },
      { href: '/mine-favoritter',  label: 'Mine favoritter' },
    ],
  },
  {
    label: 'Opskrifter & garn',
    subitems: [
      { href: '/opskrifter',         label: 'Opskrifter' },
      { href: '/garn',               label: 'Find garn' },
      { href: '/visualizer',         label: 'Prøv farven med AI' },
      { href: '#',                   label: 'Erstatningsmotor', comingSoon: true },
      { href: '#',                   label: 'Opskrift ↔ garn-match', comingSoon: true },
    ],
  },
  {
    label: 'Mød andre',
    subitems: [
      { href: '/faellesskabet', label: 'Fællesskabet' },
      { href: '/kalender',      label: 'Kalender' },
      { href: '#',              label: 'Dele strik', comingSoon: true },
    ],
  },
  {
    label: 'Striqipedia',
    subitems: [
      { href: '/faq',           label: 'FAQ & how-to' },
      { href: '/strikkeskolen', label: 'Strikkeskolen' },
      { href: '#',              label: 'Fibre & garntyper', comingSoon: true },
      { href: '#',              label: 'Certificeringer', comingSoon: true },
      { href: '#',              label: 'Bøger, podcasts & YouTube', comingSoon: true },
    ],
  },
  {
    label: 'Garnbutikker & caféer',
    subitems: [
      { href: '/find-forhandler',    label: 'Fysiske butikker' },
      { href: '/strikkecafeer',      label: 'Garncaféer' },
      { href: '/online-forhandlere', label: 'Online forhandlere' },
    ],
  },
]

export function Nav({ onRequestLogin }: { onRequestLogin?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditor, setIsEditor] = useState<boolean>(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Tracker hvilken dropdown der er åben på desktop. null = ingen.
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  // Hvilke hub-grupper er foldet ud i mobile drawer.
  const [expandedMobileHub, setExpandedMobileHub] = useState<string | null>(null)
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

  const visibleLinks: NavLink[] = isEditor
    ? [...NAV_LINKS, { href: '/garn/admin', label: 'Admin' }]
    : NAV_LINKS

  // Luk drawer og dropdown ved navigation
  useEffect(() => {
    setMenuOpen(false)
    setOpenDropdown(null)
    setExpandedMobileHub(null)
  }, [pathname])

  useEscapeKey(menuOpen, () => setMenuOpen(false))
  useEscapeKey(Boolean(openDropdown), () => setOpenDropdown(null))

  const isActive = (link: NavLink) => {
    if (link.href === '/') return pathname === '/'
    if (link.href && (pathname === link.href || pathname.startsWith(link.href + '/'))) return true
    return Boolean(link.subitems?.some(s => !s.comingSoon && (pathname === s.href || pathname.startsWith(s.href + '/'))))
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
          aria-label="STRIQ — gå til forsiden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/striq-logo-sort-rosa-beskaaret.png"
            alt="STRIQ"
            style={{ height: 'clamp(18px, 3.7vw, 32px)', width: 'auto', display: 'block' }}
          />
        </Link>

        {/* Nav-tabs (desktop) — hver hub med dropdown */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 2, flexWrap: 'nowrap' }}>
          {visibleLinks.map(link => {
            const active = isActive(link)
            const hasSub = Boolean(link.subitems && link.subitems.length > 0)
            const isOpen = openDropdown === link.label

            const tabStyle: React.CSSProperties = {
              background:           active ? 'rgba(244, 239, 230, 0.72)' : 'transparent',
              backdropFilter:       active ? 'blur(10px)' : 'none',
              WebkitBackdropFilter: active ? 'blur(10px)' : 'none',
              color:                active ? '#302218' : 'rgba(48,34,24,0.72)',
              border:               active ? '1px solid rgba(48,34,24,0.08)' : '1px solid transparent',
              borderRadius:         '999px',
              padding:              '7px 14px',
              fontSize:             '13.5px',
              fontWeight:           active ? 500 : 400,
              fontFamily:           "'DM Sans', sans-serif",
              cursor:               'pointer',
              letterSpacing:        '.01em',
              transition:           'background .15s, color .15s',
              whiteSpace:           'nowrap',
              textDecoration:       'none',
              display:              'inline-block',
            }

            return (
              <div
                key={link.label}
                style={{ position: 'relative' }}
                onMouseEnter={() => hasSub && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(prev => (prev === link.label ? null : prev))}
                onFocusCapture={() => hasSub && setOpenDropdown(link.label)}
                onBlur={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setOpenDropdown(prev => (prev === link.label ? null : prev))
                  }
                }}
              >
                {hasSub ? (
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    onClick={() => setOpenDropdown(prev => prev === link.label ? null : link.label)}
                    style={tabStyle}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link href={link.href!} style={tabStyle}>
                    {link.label}
                  </Link>
                )}

                {/* Dropdown */}
                {hasSub && isOpen && (
                  <div
                    aria-label={link.label}
                    style={{
                      position: 'absolute',
                      // Bro hen til hub-knappen: top: 100% + paddingTop fylder gap'et,
                      // så musen ikke krydser en tom zone og udløser onMouseLeave.
                      top: '100%',
                      left: 0,
                      minWidth: 240,
                      background: 'rgba(255, 252, 247, 0.98)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(48,34,24,0.08)',
                      borderRadius: 12,
                      padding: 6,
                      paddingTop: 10,
                      boxShadow: '0 6px 20px rgba(48,34,24,.12)',
                      zIndex: 110,
                    }}
                  >
                    {link.subitems!.map(sub => {
                      const subActive = !sub.comingSoon && (pathname === sub.href || pathname.startsWith(sub.href + '/'))
                      return (
                        <Link
                          key={`${sub.href}-${sub.label}`}
                          href={sub.comingSoon ? '#' : sub.href}
                          aria-disabled={sub.comingSoon ? true : undefined}
                          onClick={e => {
                            if (sub.comingSoon) { e.preventDefault(); return }
                            setOpenDropdown(null)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '9px 12px',
                            borderRadius: 8,
                            fontSize: 13.5,
                            fontWeight: subActive ? 500 : 400,
                            color: subActive ? '#302218' : 'rgba(48,34,24,0.82)',
                            background: subActive ? 'rgba(244, 239, 230, 0.6)' : 'transparent',
                            textDecoration: 'none',
                            fontFamily: "'DM Sans', sans-serif",
                            transition: 'background .12s',
                          }}
                          onMouseEnter={e => {
                            if (!subActive) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(244, 239, 230, 0.45)'
                          }}
                          onMouseLeave={e => {
                            if (!subActive) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                          }}
                        >
                          <span>{sub.label}</span>
                          {sub.comingSoon && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#9B6272',
                              background: 'rgba(212, 173, 182, 0.25)',
                              padding: '2px 8px',
                              borderRadius: 12,
                              letterSpacing: '.03em',
                              flexShrink: 0,
                            }}>
                              Snart
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
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
                const active = isActive(link)
                const hasSub = Boolean(link.subitems && link.subitems.length > 0)
                const expanded = expandedMobileHub === link.label

                return (
                  <li key={link.label}>
                    {hasSub ? (
                      <button
                        type="button"
                        onClick={() => setExpandedMobileHub(prev => prev === link.label ? null : link.label)}
                        aria-expanded={expanded}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: 48,
                          padding: '10px 14px',
                          borderRadius: 10,
                          fontSize: 15,
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: active ? 500 : 400,
                          color: active ? '#302218' : 'rgba(48,34,24,0.82)',
                          background: active ? 'rgba(255,255,255,0.55)' : 'transparent',
                          border: active ? '1px solid rgba(48,34,24,0.08)' : '1px solid transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{link.label}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={link.href!}
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
                    )}

                    {/* Undermenu i drawer */}
                    {hasSub && expanded && (
                      <ul style={{
                        listStyle: 'none',
                        margin: '4px 0 4px 18px',
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        borderLeft: '2px solid rgba(48,34,24,0.08)',
                      }}>
                        {link.subitems!.map(sub => {
                          const subActive = !sub.comingSoon && (pathname === sub.href || pathname.startsWith(sub.href + '/'))
                          return (
                            <li key={`${sub.href}-${sub.label}`}>
                              <Link
                                href={sub.comingSoon ? '#' : sub.href}
                                aria-disabled={sub.comingSoon ? true : undefined}
                                onClick={e => {
                                  if (sub.comingSoon) { e.preventDefault(); return }
                                  setMenuOpen(false)
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 10,
                                  minHeight: 40,
                                  padding: '8px 14px',
                                  borderRadius: 8,
                                  fontSize: 14,
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontWeight: subActive ? 500 : 400,
                                  color: subActive ? '#302218' : 'rgba(48,34,24,0.75)',
                                  background: subActive ? 'rgba(255,255,255,0.5)' : 'transparent',
                                  textDecoration: 'none',
                                }}
                              >
                                <span>{sub.label}</span>
                                {sub.comingSoon && (
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: '#9B6272',
                                    background: 'rgba(212, 173, 182, 0.25)',
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    letterSpacing: '.03em',
                                  }}>
                                    Snart
                                  </span>
                                )}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
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
