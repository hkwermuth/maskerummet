'use client'

import { useEffect, useRef } from 'react'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'

type Props = {
  onClose: () => void
}

const SECTIONS = [
  {
    icon: '🧶',
    title: 'Dit garnlager',
    body: 'Saml hele din garnsamling ét sted. Scan banderolen eller søg i garn-kataloget.',
  },
  {
    icon: '🧵',
    title: 'Dine projekter',
    body: 'Arkivér færdige projekter med billede, opskrift og noter — alt sammen let at genfinde.',
  },
  {
    icon: '📖',
    title: 'Opskrifter & inspiration',
    body: 'Gem opskrifter som PDF og find inspiration i fællesskabets delte projekter.',
  },
  {
    icon: '📅',
    title: 'Kalender & overblik',
    body: 'Planlæg strikkeprojekter og se hvad du har på pindene.',
  },
]

export function OnboardingModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEscapeKey(true, onClose)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(30,18,12,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          position: 'relative',
          maxWidth: 560, width: '100%',
          background: '#FFFCF7', borderRadius: 16,
          padding: '36px 28px 28px',
          boxShadow: '0 24px 60px rgba(48,34,24,.28)',
          maxHeight: '90vh', overflowY: 'auto',
          outline: 'none',
          margin: 'auto',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Luk"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(48,34,24,0.06)', border: 'none',
            cursor: 'pointer', fontSize: 20, color: '#5A4E42',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        <h2
          id="onboarding-title"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 30, fontWeight: 600, color: '#302218',
            margin: '0 0 6px',
          }}
        >
          Velkommen til Striq
        </h2>
        <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 22px', lineHeight: 1.6 }}>
          Dit personlige garnunivers — her er hvad du kan.
        </p>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {SECTIONS.map(s => (
            <div
              key={s.title}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                border: '1px solid #E5DDD9', borderRadius: 12,
                padding: '12px 14px', background: '#FFFFFF',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1.1, flexShrink: 0 }} aria-hidden="true">{s.icon}</span>
              <div>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 17, fontWeight: 600, color: '#302218',
                    margin: '0 0 2px',
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontSize: 13, color: '#5A4E42', lineHeight: 1.5 }}>
                  {s.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{
              minHeight: 44,
              padding: '10px 28px',
              background: '#61846D', color: '#fff',
              border: 'none', borderRadius: 999,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Kom i gang
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
