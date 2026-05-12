import type { Metadata } from 'next'
import Link from 'next/link'
import { FeatureCard } from '@/components/app/FeatureCards'
import { CommunityMagasin } from '@/components/app/CommunityMagasin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchOwnProfile } from '@/lib/community'
import { fetchSavedRecipes } from '@/lib/data/saved-recipes'
import { naestkommendeEvents } from './kalender/events'

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
  /** Lille stats-label i lysegrøn caps nederst på kortet (i stedet for "Åbn →"). */
  stat?: string
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
        {stort.stat ? (
          <span style={{
            marginTop: 'auto',
            fontSize: 11.5, fontWeight: 600,
            color: '#61846D',
            textTransform: 'uppercase', letterSpacing: '.12em',
          }}>
            {stort.stat}
          </span>
        ) : (
          <span style={{ fontSize: 13.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto' }}>
            Åbn →
          </span>
        )}
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
          {k.stat ? (
            <span style={{
              marginTop: 'auto', paddingTop: 4,
              fontSize: 10.5, fontWeight: 600,
              color: '#61846D',
              textTransform: 'uppercase', letterSpacing: '.12em',
            }}>
              {k.stat}
            </span>
          ) : (
            <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto', paddingTop: 4 }}>
              Åbn →
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

// ── Sektion: For dig (indlogget) ─────────────────────────────────────────────

type Stats = {
  aktive: number
  faerdige: number
  garner: number
  favoritter: number
}

function ForDigSektion({ navn, stats }: { navn: string; stats: Stats }) {
  return (
    <SektionWrapper
      tag="For dig"
      title={`Velkommen tilbage, ${navn}`}
      cta={{ href: '/mit-striq', label: 'Se alt i Mit STRIQ' }}
    >
      <AsymmetricGrid
        stort={{
          href: '/projekter',
          title: 'Mine projekter',
          desc: 'Gem dine strikkeprojekter med billeder, noter og opskrifter — dit personlige arkiv over alt det du skaber.',
          accent: '#D4ADB6',
          icon: IconProjekt(38),
          stat: `${stats.aktive} aktive · ${stats.faerdige} færdige`,
        }}
        smaa={[
          {
            href: '/garnlager',
            title: 'Mit garn',
            desc: 'Hold styr på hele dit garnlager — søg på farve, fiber og mængde.',
            accent: '#61846D',
            icon: IconGarn(),
            stat: `${stats.garner} garner på lager`,
          },
          {
            href: '/mine-favoritter',
            title: 'Mine favoritter',
            desc: 'De opskrifter du har gemt til senere — klar når inspirationen rammer.',
            accent: '#D9BFC3',
            icon: IconFavoritter(),
            stat: `${stats.favoritter} ${stats.favoritter === 1 ? 'favorit' : 'favoritter'}`,
          },
        ]}
      />
    </SektionWrapper>
  )
}

// ── Sektion: Velkommen til STRIQ (ikke logget ind) ──────────────────────────
// Venlig velkomst med 2 kort, samme stil som For dig-sektionen (rene hvide kort
// med border-left-accent). Ingen pink CTA-boks — Opret konto er en blød
// sektion længere nede på siden.

function VelkommenSektion() {
  return (
    <SektionWrapper
      tag="Velkommen"
      title="Velkommen til STRIQ"
      subtitle="Browse opskrifter og find inspiration fra fællesskabet — uden konto."
    >
      <div className="velkommen-grid" style={{
        display: 'grid',
        gap: 18,
        gridTemplateColumns: '1fr',
      }}>
        <style>{`
          @media (min-width: 720px) {
            .velkommen-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }
        `}</style>

        <Link
          href="/opskrifter-og-garn"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5DDD9',
            borderLeft: '4px solid #61846D',
            borderRadius: 12,
            padding: '28px 28px 24px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 1px 4px rgba(48,34,24,.06)',
            fontFamily: "'DM Sans', sans-serif",
            minHeight: 180,
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: '#F8F3EE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {IconOpdage(28)}
          </div>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 600, color: '#302218', margin: 0,
          }}>
            Browse opskrifter
          </h3>
          <p style={{ fontSize: 14, color: '#5C5048', margin: 0, lineHeight: 1.6 }}>
            Udforsk vores garn-katalog og opskrifter — kræver ingen konto.
          </p>
          <span style={{ fontSize: 13.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto' }}>
            Åbn →
          </span>
        </Link>

        <Link
          href="/faellesskab"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5DDD9',
            borderLeft: '4px solid #D4ADB6',
            borderRadius: 12,
            padding: '28px 28px 24px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 1px 4px rgba(48,34,24,.06)',
            fontFamily: "'DM Sans', sans-serif",
            minHeight: 180,
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: '#F8F3EE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {IconFaellesskab(28)}
          </div>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 600, color: '#302218', margin: 0,
          }}>
            Kig i fællesskabet
          </h3>
          <p style={{ fontSize: 14, color: '#5C5048', margin: 0, lineHeight: 1.6 }}>
            Bliv inspireret af andre strikkeres delte projekter.
          </p>
          <span style={{ fontSize: 13.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto' }}>
            Åbn →
          </span>
        </Link>
      </div>
    </SektionWrapper>
  )
}

// ── Blød CTA-sektion til ikke-loggede (placeres længere nede) ───────────────

function OpretKontoSektion() {
  return (
    <section style={{
      maxWidth: 1320,
      margin: '0 auto',
      padding: '0 60px 90px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: '#F8F3EE',
        border: '1px solid #E5DDD9',
        borderRadius: 16,
        padding: '40px 44px',
        textAlign: 'center',
      }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(24px, 3vw, 30px)',
          fontWeight: 600,
          color: '#302218',
          margin: '0 0 10px',
          letterSpacing: '.01em',
        }}>
          Få dit eget garn-univers
        </h3>
        <p style={{ fontSize: 15, color: '#6B5D4F', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
          Opret en konto for at få dit eget garnlager, projektarkiv og favoritter — gratis og uden binding.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{
            padding: '12px 28px',
            background: '#9B6272',
            color: '#fff',
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}>
            Opret konto
          </Link>
          <Link href="/login" style={{
            padding: '12px 28px',
            background: 'transparent',
            color: '#302218',
            border: '1px solid #D0C8BA',
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}>
            Log ind
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Delt sektion-wrapper ──────────────────────────────────────────────────────

function SektionWrapper({
  tag, title, subtitle, cta, children,
}: {
  /** Lille lysegrøn caps over titlen (fx "FOR DIG", "STÅR DU FAST?"). */
  tag?: string
  title: string
  subtitle?: string
  /** Valgfri CTA-link i højre side ved siden af titlen. */
  cta?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section style={{ maxWidth: 1320, margin: '0 auto', padding: '0 60px 90px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}>
        <div>
          {tag && (
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: '#61846D',
              textTransform: 'uppercase', letterSpacing: '.14em',
              marginBottom: 8,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {tag}
            </div>
          )}
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(32px, 4.8vw, 52px)',
            fontWeight: 500,
            color: '#302218',
            margin: '0 0 8px',
            lineHeight: 1.1,
            letterSpacing: '.005em',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 14.5, color: '#8C7E74', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
              {subtitle}
            </p>
          )}
        </div>
        {cta && (
          <Link href={cta.href} style={{
            fontSize: 12, fontWeight: 600,
            color: '#9B6272',
            textTransform: 'uppercase', letterSpacing: '.12em',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            paddingBottom: 6,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {cta.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

// ── Sektion: Står du fast? ───────────────────────────────────────────────────

const IconErstatning = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <path d="M7 23l-4-4 4-4"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
)

const IconOpskriftMatch = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
)

const IconAI = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
    <path d="M19 3v4M17 5h4"/>
  </svg>
)

function StaarDuFastSektion() {
  return (
    <SektionWrapper tag="Værktøjer" title="Brug for hjælp?">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 14,
      }}>
        <FeatureCard
          href="/opskrifter-og-garn"
          title="Find erstatning for et garn"
          desc="Foreslå alternativer baseret på fiber, vægt og strikkefasthed."
          accent="#61846D"
          icon={IconErstatning}
          size="sm"
        />
        <FeatureCard
          href="/opskrifter-og-garn"
          title="Find opskrift til dit garn"
          desc="Match dit garnlager med opskrifter der passer."
          accent="#D4ADB6"
          icon={IconOpskriftMatch}
          size="sm"
        />
        <FeatureCard
          href="/visualizer"
          title="Prøv farven med AI"
          desc="Upload et foto og se dit projekt i nye farver."
          accent="#D9BFC3"
          icon={IconAI}
          size="sm"
        />
      </div>
    </SektionWrapper>
  )
}

// ── Sektion: Det sker i strikke-Danmark ──────────────────────────────────────

function DetSkerSektion() {
  const events = naestkommendeEvents(3)
  if (events.length === 0) return null

  return (
    <SektionWrapper
      tag="Kommende arrangementer"
      title="På farten med strikketøjet"
      cta={{ href: '/kalender', label: 'Se hele kalenderen' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {events.map((ev, i) => (
          <a
            key={`${ev.titel}-${i}`}
            href={ev.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              // Cream-light baggrund, ingen border-left — dato-blokken er accenten.
              background: '#FBF7F1',
              border: '1px solid #EAE2D6',
              borderRadius: 14,
              padding: 22,
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 1px 4px rgba(48,34,24,.06)',
            }}
          >
            {/* Stor bordeaux dato-blok — kortets visuelle hjerte */}
            <div style={{
              flexShrink: 0,
              minWidth: 84,
              padding: '14px 18px',
              background: '#8B3A3A',
              color: '#F5EFE6',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: 6,
                opacity: 0.92,
              }}>
                {ev.maaned.split(' ')[0]}
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 40,
                fontWeight: 500,
                lineHeight: 1,
              }}>
                {ev.dato.match(/\d+/)?.[0] ?? ''}
              </div>
            </div>

            {/* Tekst-indhold til højre */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22,
                fontWeight: 500,
                color: '#302218',
                margin: '0 0 4px',
                letterSpacing: '.005em',
                lineHeight: 1.2,
              }}>
                {ev.titel}
              </h4>
              <p style={{
                fontSize: 14,
                color: '#8C7E74',
                margin: 0,
                lineHeight: 1.45,
              }}>
                {ev.sted}
              </p>
              <span style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '3px 10px',
                background: 'rgba(97, 132, 109, 0.14)',
                color: '#61846D',
                fontSize: 10.5,
                fontWeight: 600,
                borderRadius: 12,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              }}>
                {ev.type}
              </span>
            </div>
          </a>
        ))}
      </div>
    </SektionWrapper>
  )
}

// ── Side-by-side wrapper for Fase 5 + 6 på desktop ───────────────────────────

function HjaelpOgEventsRow() {
  return (
    <div className="hjaelp-events-row" style={{
      maxWidth: 1320,
      margin: '0 auto',
      padding: '0 60px 90px',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 32,
      alignItems: 'start', // baseline-align top af de to spalter
    }}>
      <style>{`
        @media (min-width: 960px) {
          .hjaelp-events-row {
            grid-template-columns: 1fr 1fr !important;
            gap: 48px !important;
          }
          .hjaelp-events-row > section {
            padding: 0 !important;
          }
          /* Eyebrow-tekst skal starte på samme baseline øverst i begge spalter.
             align-items: flex-start sikrer at toppen aligner uanset om titlen
             er 1 eller 2 linjer. min-height holder header-blokken konsistent
             så indholdet under (kortene) aligner. */
          .hjaelp-events-row > section > div:first-child {
            margin-bottom: 32px !important;
            min-height: 160px;
            align-items: flex-start !important;
          }
        }
      `}</style>
      <StaarDuFastSektion />
      <DetSkerSektion />
    </div>
  )
}

// ── Stats-hjælper ─────────────────────────────────────────────────────────────

async function hentStats(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<Stats> {
  // RLS-policies sikrer at vi kun får brugerens egne rækker.
  // Henter projekter med status så vi kan tælle aktive vs færdige.
  const [projektRes, garnRes, favoritter] = await Promise.all([
    supabase.from('projects').select('status').eq('user_id', userId),
    supabase.from('yarn_items').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    fetchSavedRecipes(supabase, userId).catch(() => new Set<string>()),
  ])

  const projekter = (projektRes.data ?? []) as Array<{ status: string | null }>
  const aktive = projekter.filter(p => p.status === 'i_gang' || p.status === 'vil_gerne').length
  const faerdige = projekter.filter(p => p.status === 'faerdigstrikket').length

  return {
    aktive,
    faerdige,
    garner: garnRes.count ?? 0,
    favoritter: favoritter.size,
  }
}

function displayName(profileName: string | null | undefined, email: string | null | undefined): string {
  const trimmed = profileName?.trim()
  if (trimmed) return trimmed
  if (email) {
    const local = email.split('@')[0] ?? ''
    if (local) return local.charAt(0).toUpperCase() + local.slice(1)
  }
  return 'strikker'
}

// ── Forsiden ──────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let navn = ''
  let stats: Stats | null = null
  if (user) {
    const profile = await fetchOwnProfile(supabase, user.id).catch(() => null)
    navn = displayName(profile?.display_name, user.email)
    stats = await hentStats(supabase, user.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 58px - 57px)' }}>
      <Hero />

      {/* Cream-baggrund for resten af forsiden */}
      <div style={{ background: '#F8F3EE', flex: 1, padding: '40px 0 56px' }}>
        {/* Personlig sektion øverst for begge brugertyper */}
        {user && stats ? (
          <ForDigSektion navn={navn} stats={stats} />
        ) : (
          <VelkommenSektion />
        )}

        <CommunityMagasin />

        <HjaelpOgEventsRow />

        {/* Opret konto-CTA placeret nederst (kun for ikke-loggede) */}
        {!user && <OpretKontoSektion />}
      </div>
    </div>
  )
}
