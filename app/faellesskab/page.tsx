import type { Metadata } from 'next'
import Link from 'next/link'
import { HubLayout, type HubCard } from '@/components/app/HubLayout'

export const metadata: Metadata = {
  title: 'Fællesskab — STRIQ',
  description: 'Del projekter, find inspiration og se hvad der sker i strikke-Danmark.',
}

const CARDS: HubCard[] = [
  {
    href: '/faellesskabet',
    title: 'Fællesskabet',
    desc: 'Se hvad andre strikker — del dit eget projekt med fællesskabet.',
    accent: '#D4ADB6',
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
    href: '/kalender',
    title: 'Kalender',
    desc: 'Strikke-events, workshops og meetups i hele Danmark.',
    accent: '#D9BFC3',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/faellesskab',
    title: 'Dele strik',
    desc: 'Strikke-bytte og fælles projekter — hvor vi strikker på samme tøj.',
    accent: '#D4ADB6',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M17 11l4 4-4 4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4"/>
        <line x1="13" y1="15" x2="21" y2="15"/>
      </svg>
    ),
  },
]

const EXTRA = (
  <div style={{
    marginTop: 32,
    background: '#FFFFFF',
    border: '1px solid #E5DDD9',
    borderLeft: '4px solid #61846D',
    borderRadius: 12,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <div style={{ minWidth: 240 }}>
      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 18, fontWeight: 600, color: '#302218',
        margin: '0 0 4px',
      }}>
        Find en garncafé nær dig
      </h3>
      <p style={{ fontSize: 13, color: '#8C7E74', margin: 0, lineHeight: 1.55 }}>
        Strikkecaféer er fællesskab i den virkelige verden. Se hvor de holder til.
      </p>
    </div>
    <Link href="/garnbutikker" style={{
      padding: '10px 22px',
      background: '#61846D', color: '#fff',
      borderRadius: 24, fontSize: 13.5, fontWeight: 500,
      textDecoration: 'none', whiteSpace: 'nowrap',
    }}>
      Se garncaféer →
    </Link>
  </div>
)

export default function FaellesskabPage() {
  return (
    <HubLayout
      emoji="🌿"
      title="Fællesskab"
      tagline="Del, mød og find inspiration — strikke-Danmark samlet et sted."
      heroFrom="#D4ADB6"
      heroTo="#D9BFC3"
      cards={CARDS}
      extra={EXTRA}
    />
  )
}
