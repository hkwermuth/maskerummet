import { FeatureCard } from './FeatureCards'

export type HubCard = {
  href: string
  title: string
  desc: string
  accent: string
  icon: React.ReactNode
  comingSoon?: boolean
}

type Props = {
  emoji?: string
  title: string
  tagline: string
  heroFrom?: string
  heroTo?: string
  cards: HubCard[]
  /** Ekstra indhold under kort-grid'et — fx krydsreferencer. */
  extra?: React.ReactNode
}

const DEFAULT_FROM = '#D4ADB6'
const DEFAULT_TO = '#D9BFC3'

/**
 * Genbrugbar hub-side: hero med emoji + titel + tagline, derefter et grid
 * af FeatureCards. Visuel stemning matcher resten af appen (cremebaggrund,
 * Cormorant-titler, DM Sans-brødtekst).
 */
export function HubLayout({ emoji, title, tagline, heroFrom, heroTo, cards, extra }: Props) {
  const from = heroFrom ?? DEFAULT_FROM
  const to = heroTo ?? DEFAULT_TO

  return (
    <div style={{ background: '#F8F3EE', minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        {emoji && <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 600,
          color: '#302218',
          margin: '0 0 10px',
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontStyle: 'italic',
          color: '#302218',
          margin: '0 auto', maxWidth: 560, lineHeight: 1.55,
          opacity: 0.85,
        }}>
          {tagline}
        </p>
      </div>

      {/* Kort-grid */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 56px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 18,
        }}>
          {cards.map(c => (
            <FeatureCard
              key={c.href}
              href={c.href}
              title={c.title}
              desc={c.desc}
              accent={c.accent}
              icon={c.icon}
              comingSoon={c.comingSoon}
            />
          ))}
        </div>

        {extra}
      </div>
    </div>
  )
}
