import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Strikkeskolen — Striq',
  description: 'Lær nye teknikker med guides og videoer — kommer snart.',
}

const C = {
  bg:        '#F8F3EE',
  text:      '#302218',
  textMuted: '#8C7E74',
  sage:      '#61846D',
  dustyPink: '#D4ADB6',
  accent:    '#D9BFC3',
  border:    '#E5DDD9',
}

const PLANLAGT = [
  { emoji: '🧶', tekst: 'Kom godt i gang — grundlæggende masker og teknikker' },
  { emoji: '🪡', tekst: 'Strikkefasthed og gauge — forstå din prøvelap' },
  { emoji: '🎨', tekst: 'Farveskift og garnvalg — teknikker til rene overgange' },
  { emoji: '✂️', tekst: 'Aflukninger — italiensk, elastisk og dekorativ' },
  { emoji: '🌿', tekst: 'Fiberguide — merino, alpaka, silke og meget mere' },
]

export default function StrikkekolenPage() {
  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.dustyPink} 0%, ${C.accent} 100%)`,
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 10px',
        }}>
          Strikkeskolen
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontStyle: 'italic',
          color: C.text,
          margin: '0 auto', maxWidth: 500, lineHeight: 1.55,
          opacity: 0.85,
        }}>
          Vi bygger en samling af guides og videoer — fra begynder til avanceret.
        </p>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '48px 24px 72px' }}>
        {/* Kommer snart kort */}
        <div style={{
          background: '#FFFFFF',
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '36px 32px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(48,34,24,.05)',
          marginBottom: 32,
        }}>
          <div style={{
            display: 'inline-block',
            background: `${C.dustyPink}30`,
            color: '#9B6272',
            fontSize: 13,
            fontWeight: 600,
            padding: '5px 14px',
            borderRadius: 20,
            marginBottom: 20,
            letterSpacing: '.03em',
          }}>
            Kommer snart
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24, fontWeight: 600,
            color: C.text, margin: '0 0 12px',
          }}>
            Guides og teknikker er på vej
          </h2>
          <p style={{ fontSize: 14.5, color: C.textMuted, lineHeight: 1.7, margin: '0 0 28px' }}>
            Vi arbejder på trin-for-trin guides med billeder og video,
            så du kan lære nye teknikker i dit eget tempo.
          </p>

          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PLANLAGT.map((p, i) => (
              <div key={i} style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{p.emoji}</span>
                <span style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>{p.tekst}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ link */}
        <div style={{
          background: '#FFFFFF',
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '24px 28px',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 14.5, color: C.text, margin: '0 0 14px', lineHeight: 1.6 }}>
            Har du spørgsmål om strik og garn i mellemtiden?
          </p>
          <Link
            href="/faq"
            style={{
              display: 'inline-block', padding: '10px 22px',
              background: C.sage, color: '#fff', borderRadius: 24,
              fontSize: 14, fontWeight: 500, textDecoration: 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Se vores FAQ
          </Link>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${C.accent} 0%, ${C.dustyPink}66 100%)`,
          borderRadius: 12,
          padding: '24px 28px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: C.text, margin: '0 0 8px', lineHeight: 1.6 }}>
            Har du forslag til guides eller vil dele din viden?
          </p>
          <a
            href="mailto:kontakt@striq.dk"
            style={{ fontSize: 14, fontWeight: 500, color: C.sage, textDecoration: 'underline' }}
          >
            Skriv til os på kontakt@striq.dk
          </a>
        </div>
      </div>
    </div>
  )
}
