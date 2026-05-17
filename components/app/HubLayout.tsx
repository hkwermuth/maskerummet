import { FeatureCard } from './FeatureCards'
import { HeroIllustration, type Variant } from '@/components/layout/HeroIllustration'

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
  /** Når sat bruges flex-hero: tekst venstre, illustration højre. */
  heroVariant?: Variant
  /** Kortenes visuelle størrelse. Default 'md'. */
  cardSize?: 'sm' | 'md' | 'lg'
  cards: HubCard[]
  /** Ekstra indhold under kort-grid'et — fx krydsreferencer. */
  extra?: React.ReactNode
}

const DEFAULT_FROM = '#D4ADB6'
const DEFAULT_TO = '#D9BFC3'

export function HubLayout({ emoji, title, tagline, heroFrom, heroTo, heroVariant, cardSize = 'md', cards, extra }: Props) {
  const from = heroFrom ?? DEFAULT_FROM
  const to = heroTo ?? DEFAULT_TO
  const hasIllustration = !!heroVariant

  return (
    <div style={{ background: '#F8F3EE', minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        padding: hasIllustration ? '36px 24px 32px' : '32px 24px 28px',
      }}>
        {hasIllustration ? (
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', gap: 28, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 380px', minWidth: 240 }}>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 600, color: '#302218', margin: '0 0 10px',
              }}>
                {title}
              </h1>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(16px, 2vw, 20px)',
                fontStyle: 'italic', color: '#302218',
                margin: 0, maxWidth: 480, lineHeight: 1.55, opacity: 0.85,
              }}>
                {tagline}
              </p>
            </div>
            <div style={{ flexShrink: 0, width: 200, maxWidth: '40%' }}>
              <HeroIllustration variant={heroVariant} />
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            {emoji && <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>}
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 600, color: '#302218', margin: '0 0 10px',
            }}>
              {title}
            </h1>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontStyle: 'italic', color: '#302218',
              margin: '0 auto', maxWidth: 560, lineHeight: 1.55, opacity: 0.85,
            }}>
              {tagline}
            </p>
          </div>
        )}
      </div>

      {/* Kort-grid med subtil tonel overgang fra hero */}
      <div style={{ background: `linear-gradient(180deg, ${to}44 0%, transparent 140px)` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 56px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 380px))',
            justifyContent: 'center',
            gap: cardSize === 'lg' ? 24 : 18,
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
                size={cardSize}
              />
            ))}
          </div>

          {extra}
        </div>
      </div>
    </div>
  )
}
