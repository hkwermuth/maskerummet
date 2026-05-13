import type { Metadata } from 'next'
import { HubLayout, type HubCard } from '@/components/app/HubLayout'

export const metadata: Metadata = {
  title: 'Opskrifter & garn — STRIQ',
  description: 'Find opskrifter, udforsk garn-kataloget og prøv vores AI-værktøjer.',
}

const CARDS: HubCard[] = [
  {
    href: '/opskrifter',
    title: 'Opskrifter',
    desc: 'Browse vores samling — fra begynder til avanceret.',
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
    href: '/garn',
    title: 'Find garn',
    desc: 'Udforsk garn-kataloget — søg på fiber, tykkelse og mærke.',
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
    desc: 'Upload et foto og se dit projekt i nye farver.',
    accent: '#D4ADB6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
        <path d="M19 3v4M17 5h4"/>
      </svg>
    ),
  },
  {
    href: '/garn',
    title: 'Erstatningsmotor',
    desc: 'Find alternativer til et garn baseret på fiber, vægt og strikkefasthed.',
    accent: '#D4ADB6',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <path d="M7 23l-4-4 4-4"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    ),
  },
  {
    href: '/opskrifter',
    title: 'Opskrift ↔ garn-match',
    desc: 'Find opskrifter der passer til det garn du har i lageret.',
    accent: '#D4ADB6',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
]

export default function OpskrifterOgGarnPage() {
  return (
    <HubLayout
      emoji="📖"
      title="Opskrifter & garn"
      tagline="Inspiration, katalog og AI-værktøjer — alt om garn samlet et sted."
      heroFrom="#61846D55"
      heroTo="#D9BFC3"
      cards={CARDS}
    />
  )
}
