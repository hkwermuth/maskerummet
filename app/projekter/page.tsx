'use client'

import { LoginGate } from '@/components/app/LoginGate'
import Arkiv from '@/components/app/Arkiv'
import { HeroIllustration } from '@/components/layout/HeroIllustration'

function ProjekterHero() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, rgba(97,132,109,.2) 0%, #D9BFC3 100%)',
      padding: '36px 0 32px',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        display: 'flex', gap: 28,
        alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 420px', minWidth: 260 }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4.2vw, 38px)',
            fontWeight: 600, color: '#302218', margin: 0, letterSpacing: '.01em',
          }}>
            Mine strikkeprojekter
          </h1>
          <p style={{
            fontSize: 14.5, color: '#6B5D4F',
            margin: '6px 0 0', maxWidth: 640, lineHeight: 1.55,
          }}>
            Hold styr på strikkekurven, ønskelisten og alt det færdige.
          </p>
        </div>
        <div className="projekter-hero-art" style={{
          flexShrink: 0, width: 220, maxWidth: '100%',
        }}>
          <HeroIllustration variant="projekter-tre-stadier" />
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .projekter-hero-art { display: none !important; }
        }
      `}</style>
    </section>
  )
}

export default function ProjekterPage() {
  return (
    <LoginGate
      title="Mine strikkeprojekter"
      desc="Hold styr på strikkekurven, ønskelisten og alt det færdige. Log ind for at komme i gang."
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
      }
    >
      {(user) => (
        <>
          <ProjekterHero />
          <Arkiv user={user} onRequestLogin={() => {}} />
        </>
      )}
    </LoginGate>
  )
}
