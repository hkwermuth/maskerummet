// Strikkeskolen — læringsside med FAQ-indhold + guides
import Faq from './Faq'

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

const GUIDES = [
  {
    emoji: '🧶',
    title: 'Kom godt i gang med strik',
    desc: 'Lær de grundlæggende masker og teknikker — perfekt for begyndere.',
    tag: 'Begynder',
    tagColor: C.sage,
  },
  {
    emoji: '🪡',
    title: 'Trådspaending og gauge',
    desc: 'Forstå vigtigheden af strikkefasthed og lær at lave en prøve.',
    tag: 'Begynder',
    tagColor: C.sage,
  },
  {
    emoji: '🔄',
    title: 'Rundpind vs. strømpepinde',
    desc: 'Hvornår bruger du hvad? Vi gennemgår fordele og ulemper ved begge.',
    tag: 'Begynder',
    tagColor: C.sage,
  },
  {
    emoji: '🎨',
    title: 'Skifte farve og tilføje garn',
    desc: 'Teknikker til rene farveskift og indvævning af nyt garn undervejs.',
    tag: 'Øvet',
    tagColor: C.dustyPink,
  },
  {
    emoji: '✂️',
    title: 'Italiensk aflukning',
    desc: 'Elastisk og elegant aflukning — trin for trin med billeder.',
    tag: 'Øvet',
    tagColor: C.dustyPink,
  },
  {
    emoji: '🌿',
    title: 'Fiber, merino og alpaka',
    desc: 'Lær forskellen på de mest populære garntyper og hvornår du bruger dem.',
    tag: 'Viden',
    tagColor: C.accent,
  },
]

export default function Strikkeskolen({ onNavigate }) {
  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Hero-banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.dustyPink} 0%, ${C.accent} 100%)`,
        padding: '48px 24px 40px',
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
        <p style={{ fontSize: 15, color: C.textMuted, margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
          Lær nye teknikker med trin-for-trin guides, videoer og FAQ — fra begynder til avanceret.
        </p>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* Guides */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26, fontWeight: 600,
          color: C.text, margin: '0 0 20px',
        }}>
          Guides og teknikker
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 52,
        }}>
          {GUIDES.map((g, i) => (
            <div key={i} style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 1px 4px rgba(48,34,24,.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 28 }}>{g.emoji}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#fff',
                  background: g.tagColor,
                  borderRadius: 20,
                  padding: '3px 10px',
                  letterSpacing: '.03em',
                }}>
                  {g.tag}
                </span>
              </div>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18, fontWeight: 600,
                color: C.text, margin: 0,
              }}>
                {g.title}
              </h3>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.55 }}>
                {g.desc}
              </p>
              <span style={{ fontSize: 12.5, color: C.link, fontWeight: 500, marginTop: 4 }}>
                Læs guide →
              </span>
            </div>
          ))}
        </div>

        {/* FAQ-sektion (genbrug eksisterende komponent) */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26, fontWeight: 600,
          color: C.text, margin: '0 0 4px',
        }}>
          Ofte stillede spørgsmål
        </h2>
        <p style={{ fontSize: 14, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.6 }}>
          Svar på de mest almindelige spørgsmål om strik og garn.
        </p>

        <Faq embedded />

      </div>
    </div>
  )
}
