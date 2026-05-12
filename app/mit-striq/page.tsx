import type { Metadata } from 'next'
import { HubLayout, type HubCard } from '@/components/app/HubLayout'

export const metadata: Metadata = {
  title: 'Mit STRIQ — STRIQ',
  description: 'Dit garnlager, dine projekter og dine favoritter — alt på ét sted.',
}

const CARDS: HubCard[] = [
  {
    href: '/garnlager',
    title: 'Mit garn',
    desc: 'Hold styr på dit garnlager — søg på farve, fiber og status.',
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
    desc: 'Gem strikkeprojekter med billeder, noter og opskrifter.',
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
    href: '/mine-favoritter',
    title: 'Mine favoritter',
    desc: 'De opskrifter du har gemt med et hjerte.',
    accent: '#D9BFC3',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
]

export default function MitStriqPage() {
  return (
    <HubLayout
      emoji="🧶"
      title="Mit STRIQ"
      tagline="Dit personlige strikke-univers — garn, projekter og opskrifter."
      heroFrom="#61846D55"
      heroTo="#D4ADB6"
      cards={CARDS}
    />
  )
}
