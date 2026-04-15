// Om STRIQ — brandside med mission og baggrund
const C = {
  bg:        '#F8F3EE',
  cardBg:    '#FFFFFF',
  text:      '#302218',
  textMuted: '#8C7E74',
  sage:      '#61846D',
  dustyPink: '#D4ADB6',
  accent:    '#D9BFC3',
  border:    '#E5DDD9',
  link:      '#9B6272',
}

const VAERDIER = [
  {
    emoji: '🌿',
    titel: 'Bæredygtighed',
    tekst: 'Vi støtter naturlige fibre og ansvarlig produktion. At strikke selv er et bevidst valg — for kvalitet og for planeten.',
  },
  {
    emoji: '🤝',
    titel: 'Fællesskab',
    tekst: 'Strik bringer mennesker sammen. STRIQ er bygget med respekt for den tradition og de håndværkere, der holder den i live.',
  },
  {
    emoji: '✨',
    titel: 'Enkelhed',
    tekst: 'Vi designer enkle, intuitive værktøjer så du kan fokusere på det der betyder noget: selve strikkeoplevelsen.',
  },
  {
    emoji: '📚',
    titel: 'Viden',
    tekst: 'Vi tror på deling af viden. Fra begynder til mester — alle fortjener adgang til gode guides og fælles erfaring.',
  },
]

export default function OmStriq({ onNavigate }) {
  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.dustyPink} 0%, ${C.sage}55 100%)`,
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <img
          src="/brand/striq-logo.png"
          alt="STRIQ"
          style={{ height: 52, width: 'auto', marginBottom: 20 }}
        />
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 46px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 12px',
        }}>
          Om STRIQ
        </h1>
        <p style={{
          fontSize: 16, color: C.textMuted,
          margin: '0 auto', maxWidth: 560, lineHeight: 1.7,
        }}>
          STRIQ er dit personlige garnunivers — skabt af strikkeentusiaster til strikkeentusiaster.
        </p>
      </div>

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '48px 24px 72px' }}>

        {/* Historien */}
        <div style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '32px 32px',
          marginBottom: 40,
          boxShadow: '0 1px 4px rgba(48,34,24,.05)',
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26, fontWeight: 600,
            color: C.text, margin: '0 0 16px',
          }}>
            Historien bag STRIQ
          </h2>
          <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.75, margin: '0 0 14px' }}>
            STRIQ begyndte som et simpelt behov: en nem måde at holde styr på alt det garn, der langsomt overtog hjemmet. Et regneark var ikke godt nok. En notesbog heller ikke. Så begyndte vi at bygge.
          </p>
          <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.75, margin: '0 0 14px' }}>
            I dag er STRIQ vokset til en platform der hjælper strikkere med at organisere deres garnlager, gemme projekter, finde inspiration og lære nye teknikker — alt samlet ét sted.
          </p>
          <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.75, margin: 0 }}>
            Vi er et lille team af strikkeelskere med en passion for godt design og gode oplevelser. STRIQ er bygget med kærlighed til håndværket.
          </p>
        </div>

        {/* Værdier */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26, fontWeight: 600,
          color: C.text, margin: '0 0 20px',
        }}>
          Vores værdier
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 44,
        }}>
          {VAERDIER.map((v, i) => (
            <div key={i} style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '24px 22px',
              boxShadow: '0 1px 4px rgba(48,34,24,.04)',
            }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{v.emoji}</div>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 19, fontWeight: 600,
                color: C.text, margin: '0 0 8px',
              }}>
                {v.titel}
              </h3>
              <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
                {v.tekst}
              </p>
            </div>
          ))}
        </div>

        {/* Kontakt */}
        <div style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '28px 32px',
          boxShadow: '0 1px 4px rgba(48,34,24,.04)',
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 600,
            color: C.text, margin: '0 0 10px',
          }}>
            Kontakt os
          </h2>
          <p style={{ fontSize: 14, color: C.textMuted, margin: '0 0 8px', lineHeight: 1.65 }}>
            Har du spørgsmål, idéer eller vil du bidrage til STRIQ? Vi hører gerne fra dig.
          </p>
          <a
            href="mailto:hej@striq.dk"
            style={{ fontSize: 14, color: C.link, fontWeight: 500, textDecoration: 'none' }}
          >
            hej@striq.dk →
          </a>
        </div>

      </div>
    </div>
  )
}
