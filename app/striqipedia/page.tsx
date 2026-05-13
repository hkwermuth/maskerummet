import type { Metadata } from 'next'
import { HubLayout, type HubCard } from '@/components/app/HubLayout'

export const metadata: Metadata = {
  title: 'Striqipedia — STRIQ',
  description: 'Viden om strik, fibre, certificeringer og strikke-kultur.',
}

const CARDS: HubCard[] = [
  {
    href: '/faq',
    title: 'FAQ & how-to',
    desc: 'Svar på grundlæggende spørgsmål om strik og teknikker.',
    accent: '#61846D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    href: '/strikkeskolen',
    title: 'Strikkeskolen',
    desc: 'Trin-for-trin guides til nye teknikker — under opbygning.',
    accent: '#D9BFC3',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
  {
    href: '/striqipedia',
    title: 'Fibre & garntyper',
    desc: 'Lær om uld, merino, alpaka, silke, bomuld og blandinger.',
    accent: '#61846D',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z"/>
        <path d="M3 12h18M12 3v18"/>
      </svg>
    ),
  },
  {
    href: '/striqipedia',
    title: 'Certificeringer',
    desc: 'GOTS, Oeko-Tex, mulesing-free — hvad betyder mærkerne?',
    accent: '#D4ADB6',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: '/striqipedia',
    title: 'Bøger, podcasts & YouTube',
    desc: 'Anbefalet litteratur og indhold om strik fra danske kilder.',
    accent: '#D4ADB6',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
]

export default function StriqipediaPage() {
  return (
    <HubLayout
      emoji="📚"
      title="Striqipedia"
      tagline="Et opslagsværk om strik — fra grundteknikker til fiberhistorier."
      heroFrom="#D9BFC3"
      heroTo="#61846D55"
      cards={CARDS}
    />
  )
}
