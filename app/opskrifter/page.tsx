import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Opskrifter — Striq',
  description: 'Strikkeopskrifter fra begynder til avanceret — kommer snart.',
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
  { emoji: '🧢', tekst: 'Begynderprojekter — huer, klude og enkle tørklæder' },
  { emoji: '🧥', tekst: 'Øvet-niveau — raglantrøjer, cardigans og vanter' },
  { emoji: '❄️', tekst: 'Avanceret — fairisle, lace og kabelmønstre' },
  { emoji: '🔄', tekst: 'Garnalternativer til hver opskrift fra vores katalog' },
]

export default function OpskrifterPage() {
  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, rgba(97,132,109,.2) 0%, ${C.accent} 100%)`,
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 10px',
        }}>
          Opskrifter
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontStyle: 'italic',
          color: C.text,
          margin: '0 auto', maxWidth: 500, lineHeight: 1.55,
          opacity: 0.85,
        }}>
          Vi arbejder på en samling af strikkeopskrifter — fra enkle begynderprojekter til avancerede mønstre.
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
            background: `${C.sage}18`,
            color: C.sage,
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
            Opskrifter er på vej
          </h2>
          <p style={{ fontSize: 14.5, color: C.textMuted, lineHeight: 1.7, margin: '0 0 28px' }}>
            Vi samler og kvalitetstjekker opskrifter, så du snart kan finde inspiration
            direkte i STRIQ — med garnforslag fra vores katalog.
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

        <div style={{
          background: `linear-gradient(135deg, ${C.accent} 0%, ${C.dustyPink}66 100%)`,
          borderRadius: 12,
          padding: '24px 28px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: C.text, margin: '0 0 8px', lineHeight: 1.6 }}>
            Har du ønsker til opskrifter eller vil bidrage?
          </p>
          <a
            href="mailto:hej@striq.dk"
            style={{
              fontSize: 14, fontWeight: 500, color: C.sage,
              textDecoration: 'underline',
            }}
          >
            Skriv til os på hej@striq.dk
          </a>
        </div>
      </div>
    </div>
  )
}
