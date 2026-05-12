import type { Metadata } from 'next'
import { HubLayout, type HubCard } from '@/components/app/HubLayout'

export const metadata: Metadata = {
  title: 'Garnbutikker & caféer — STRIQ',
  description: 'Find garnbutikker, strikkecaféer og online forhandlere over hele Danmark.',
}

const CARDS: HubCard[] = [
  {
    href: '/find-forhandler',
    title: 'Fysiske butikker',
    desc: 'Find garnbutikker nær dig — se dem på et kort med åbningstider.',
    accent: '#D4ADB6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    href: '/strikkecafeer',
    title: 'Garncaféer',
    desc: 'Strik sammen med andre i hyggelige lokaler over hele landet.',
    accent: '#61846D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
  },
  {
    href: '/find-forhandler',
    title: 'Online forhandlere',
    desc: 'Webshops der sælger dine yndlingsgarn — leveret til døren.',
    accent: '#D9BFC3',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    ),
  },
]

export default function GarnbutikkerPage() {
  return (
    <HubLayout
      emoji="🛍️"
      title="Garnbutikker & caféer"
      tagline="Find dit næste garn — fysisk, online eller mens du strikker sammen med andre."
      heroFrom="#D4ADB6"
      heroTo="#61846D55"
      cards={CARDS}
    />
  )
}
