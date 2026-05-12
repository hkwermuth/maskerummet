import type { Metadata } from 'next'
import Link from 'next/link'
import { FeatureCard } from '@/components/app/FeatureCards'
import { CommunityMagasin } from '@/components/app/CommunityMagasin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'STRIQ — Dit personlige garnunivers',
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconGarn = (size = 32) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="15" rx="9" ry="5"/>
    <path d="M3 10c0-2.8 4-5 9-5s9 2.2 9 5"/>
    <path d="M3 10v5M21 10v5"/>
    <circle cx="12" cy="10" r="1.2" fill="#61846D" stroke="none"/>
  </svg>
)

const IconProjekt = (size = 32) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
)

const IconFavoritter = (size = 32) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const IconOpdage = (size = 32) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const IconFaellesskab = (size = 32) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

// ── Forsidens hero (uændret fra Fase 2) ────────────────────────────────────────

function Hero() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '64px 20px 56px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/striq-logo-creme-rosa-traad-3d-transparent.png"
        alt="STRIQ"
        style={{
          height: 'clamp(110px, 24vw, 190px)',
          width: 'auto',
          maxWidth: '92vw',
          filter: 'drop-shadow(0 3px 18px rgba(0,0,0,0.28))',
        }}
      />
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'clamp(34px, 5.5vw, 56px)',
        fontWeight: 600,
        color: '#FFFCF7',
        margin: 0,
        letterSpacing: '.02em',
        textShadow: '0 2px 16px rgba(0,0,0,0.30)',
      }}>
        Dit strikke-univers
      </h1>
    </div>
  )
}

// ── Asymmetrisk kort (1 stort + 2 små) ────────────────────────────────────────

type AsymKort = {
  href: string
  title: string
  desc: string
  accent: string
  icon: React.ReactNode
}

/**
 * 1 stort kort til venstre, 2 små kort i en kolonne til højre.
 * Desktop (≥720px): 2fr | 1fr (stort spænder begge rækker)
 * Mobil: stacked.
 */
function AsymmetricGrid({ stort, smaa }: { stort: AsymKort; smaa: [AsymKort, AsymKort] }) {
  return (
    <div className="asym-grid" style={{
      display: 'grid',
      gap: 18,
      gridTemplateColumns: '1fr',
    }}>
      <style>{`
        @media (min-width: 720px) {
          .asym-grid {
            grid-template-columns: 2fr 1fr !important;
            grid-template-rows: 1fr 1fr !important;
          }
          .asym-grid > :first-child {
            grid-row: 1 / span 2;
          }
        }
      `}</style>

      {/* Stort kort */}
      <Link
        href={stort.href}
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5DDD9',
          borderLeft: `4px solid ${stort.accent}`,
          borderRadius: 16,
          padding: '36px 32px 32px',
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 1px 4px rgba(48,34,24,.06)',
          minHeight: 240,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: '#F8F3EE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {stort.icon}
        </div>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(24px, 3vw, 30px)',
          fontWeight: 600, color: '#302218', margin: 0,
        }}>
          {stort.title}
        </h3>
        <p style={{ fontSize: 15, color: '#5C5048', margin: 0, lineHeight: 1.6, maxWidth: 460 }}>
          {stort.desc}
        </p>
        <span style={{ fontSize: 13.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto' }}>
          Åbn →
        </span>
      </Link>

      {/* Små kort */}
      {smaa.map(k => (
        <Link
          key={k.href}
          href={k.href}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5DDD9',
            borderLeft: `4px solid ${k.accent}`,
            borderRadius: 12,
            padding: '22px 22px 20px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 1px 4px rgba(48,34,24,.06)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: '#F8F3EE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {k.icon}
          </div>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 18, fontWeight: 600, color: '#302218', margin: 0,
          }}>
            {k.title}
          </h3>
          <p style={{ fontSize: 13, color: '#8C7E74', margin: 0, lineHeight: 1.55 }}>
            {k.desc}
          </p>
          <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto', paddingTop: 4 }}>
            Åbn →
          </span>
        </Link>
      ))}
    </div>
  )
}

// ── Sektion: For dig (indlogget) ─────────────────────────────────────────────

function ForDigSektion() {
  return (
    <SektionWrapper title="For dig" subtitle="Spring direkte til dine egne data.">
      <AsymmetricGrid
        stort={{
          href: '/projekter',
          title: 'Mine projekter',
          desc: 'Dit personlige arkiv med billeder, noter og garn-allokering. Hold styr på hvad du strikker lige nu og hvad du har færdiggjort.',
          accent: '#D4ADB6',
          icon: IconProjekt(38),
        }}
        smaa={[
          {
            href: '/garnlager',
            title: 'Mit garn',
            desc: 'Søg, filtrér og hold styr på dit lager.',
            accent: '#61846D',
            icon: IconGarn(),
          },
          {
            href: '/mine-favoritter',
            title: 'Mine favoritter',
            desc: 'Opskrifter du har gemt med hjerte.',
            accent: '#D9BFC3',
            icon: IconFavoritter(),
          },
        ]}
      />
    </SektionWrapper>
  )
}

// ── Sektion: Kom i gang (ikke logget ind) ────────────────────────────────────

function KomIGangSektion() {
  return (
    <SektionWrapper title="Kom i gang" subtitle="Opret en konto og få styr på dit garnlager og dine projekter.">
      <AsymmetricGrid
        stort={{
          href: '/signup',
          title: 'Opret konto',
          desc: 'Få adgang til dit personlige garnlager, projekter og favoritter. Det er gratis at oprette en konto.',
          accent: '#D4ADB6',
          icon: IconProjekt(38),
        }}
        smaa={[
          {
            href: '/opskrifter-og-garn',
            title: 'Udforsk opskrifter',
            desc: 'Browse opskrifter og garn — kræver ingen konto.',
            accent: '#61846D',
            icon: IconOpdage(),
          },
          {
            href: '/faellesskab',
            title: 'Se fællesskabet',
            desc: 'Bliv inspireret af andres projekter.',
            accent: '#D9BFC3',
            icon: IconFaellesskab(),
          },
        ]}
      />
    </SektionWrapper>
  )
}

// ── Delt sektion-wrapper ──────────────────────────────────────────────────────

function SektionWrapper({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(24px, 3.2vw, 32px)',
          fontWeight: 600,
          color: '#302218',
          margin: '0 0 6px',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 14.5, color: '#8C7E74', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

// ── Forsiden ──────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = Boolean(user)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 58px - 57px)' }}>
      <Hero />

      {/* Cream-baggrund for resten af forsiden */}
      <div style={{ background: '#F8F3EE', flex: 1, padding: '40px 0 56px' }}>
        {isLoggedIn ? <ForDigSektion /> : <KomIGangSektion />}

        <CommunityMagasin />
      </div>
    </div>
  )
}
