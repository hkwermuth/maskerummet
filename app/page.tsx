import type { Metadata } from 'next'
import { FeatureCard } from '@/components/app/FeatureCards'

export const metadata: Metadata = {
  title: 'STRIQ — Dit personlige garnunivers',
}

const FEATURES = [
  {
    href: '/garnlager',
    title: 'Mit garnlager',
    desc: 'Hold styr på hele dit garnlager — søg på farve, fiber og se hvad du har på lager.',
    accent: '#61846D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="15" rx="9" ry="5"/>
        <path d="M3 10c0-2.8 4-5 9-5s9 2.2 9 5"/>
        <path d="M3 10v5M21 10v5"/>
        <circle cx="12" cy="10" r="1.2" fill="#61846D" stroke="none"/>
      </svg>
    ),
  },
  {
    href: '/projekter',
    title: 'Mine projekter',
    desc: 'Gem dine strikkeprojekter med billeder, noter og opskrifter — dit personlige arkiv.',
    accent: '#D4ADB6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/kalender',
    title: 'Kalender',
    desc: 'Find kommende strikke-events, workshops og meetups i dit område.',
    accent: '#D9BFC3',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="8" cy="15" r="0.8" fill="#9B6272"/>
        <circle cx="12" cy="15" r="0.8" fill="#9B6272"/>
        <circle cx="16" cy="15" r="0.8" fill="#9B6272"/>
      </svg>
    ),
  },
  {
    href: '/garn',
    title: 'Find garn',
    desc: 'Udforsk vores garnkatalog — søg på fiber, tykkelse, farve og mærke.',
    accent: '#61846D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/visualizer',
    title: 'Prøv farven med AI',
    desc: 'Upload et foto og se hvordan dit projekt ser ud i nye farver — AI-drevet visualisering.',
    accent: '#D4ADB6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
        <path d="M19 3v4M17 5h4"/>
      </svg>
    ),
  },
  {
    href: '/faellesskabet',
    title: 'Fællesskabet',
    desc: 'Se andre strikkeres færdige projekter — hent inspiration til dit næste projekt.',
    accent: '#D9BFC3',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2"/>
        <line x1="12" y1="3.5" x2="12" y2="20.5"/>
        <line x1="8.5" y1="11.5" x2="8.5" y2="13.5"/>
        <line x1="15.5" y1="11.5" x2="15.5" y2="13.5"/>
      </svg>
    ),
  },
  {
    href: '/opskrifter',
    title: 'Opskrifter',
    desc: 'Browse vores samling af strikkeopskrifter — fra begynder til avanceret.',
    accent: '#61846D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="9" y1="7" x2="15" y2="7"/>
        <line x1="9" y1="11" x2="15" y2="11"/>
        <line x1="9" y1="15" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    href: '/find-forhandler',
    title: 'Find forhandler',
    desc: 'Find butikker i nærheden der sælger dit yndlingsgarn — se dem på et kort.',
    accent: '#D4ADB6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
]

export default function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 58px - 57px)' }}>

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '64px 20px 56px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
      }}>
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

      {/* Feature-kort */}
      <div style={{ background: '#F8F3EE', flex: 1, padding: '40px 24px 64px' }}>
        <div style={{
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 18,
        }}>
          {FEATURES.map(f => (
            <FeatureCard
              key={f.href}
              href={f.href}
              title={f.title}
              desc={f.desc}
              accent={f.accent}
              icon={f.icon}
            />
          ))}
        </div>
      </div>

    </div>
  )
}

