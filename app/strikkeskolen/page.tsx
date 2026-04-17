import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Strikkeskolen — Striq',
  description: 'Lær nye teknikker med trin-for-trin guides, videoer og FAQ — fra begynder til avanceret.',
}

const GUIDES = [
  { emoji: '🧶', title: 'Kom godt i gang med strik', desc: 'Lær de grundlæggende masker og teknikker — perfekt for begyndere.', tag: 'Begynder', tagColor: '#61846D' },
  { emoji: '🪡', title: 'Trådspaending og gauge', desc: 'Forstå vigtigheden af strikkefasthed og lær at lave en prøve.', tag: 'Begynder', tagColor: '#61846D' },
  { emoji: '🔄', title: 'Rundpind vs. strømpepinde', desc: 'Hvornår bruger du hvad? Vi gennemgår fordele og ulemper ved begge.', tag: 'Begynder', tagColor: '#61846D' },
  { emoji: '🎨', title: 'Skifte farve og tilføje garn', desc: 'Teknikker til rene farveskift og indvævning af nyt garn undervejs.', tag: 'Øvet', tagColor: '#D4ADB6' },
  { emoji: '✂️', title: 'Italiensk aflukning', desc: 'Elastisk og elegant aflukning — trin for trin med billeder.', tag: 'Øvet', tagColor: '#D4ADB6' },
  { emoji: '🌿', title: 'Fiber, merino og alpaka', desc: 'Lær forskellen på de mest populære garntyper og hvornår du bruger dem.', tag: 'Viden', tagColor: '#D9BFC3' },
]

export default function StrikkekolenPage() {
  return (
    <div className="font-sans">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #D4ADB6 0%, #D9BFC3 100%)', padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, color: '#302218', margin: '0 0 10px' }}>
          Strikkeskolen
        </h1>
        <p style={{ fontSize: 15, color: '#8C7E74', margin: '0 auto', maxWidth: 480, lineHeight: 1.65 }}>
          Lær nye teknikker med trin-for-trin guides, videoer og FAQ — fra begynder til avanceret.
        </p>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* Guides */}
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#302218', margin: '0 0 20px' }}>
          Guides og teknikker
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 52 }}>
          {GUIDES.map((g, i) => (
            <div key={i} style={{
              background: '#FFFFFF', border: '1px solid #E5DDD9', borderRadius: 12,
              padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 8,
              boxShadow: '0 1px 4px rgba(48,34,24,.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 28 }}>{g.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: g.tagColor, borderRadius: 20, padding: '3px 10px', letterSpacing: '.03em' }}>
                  {g.tag}
                </span>
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#302218', margin: 0 }}>
                {g.title}
              </h3>
              <p style={{ fontSize: 13, color: '#8C7E74', margin: 0, lineHeight: 1.55 }}>{g.desc}</p>
              <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500, marginTop: 4 }}>Læs guide →</span>
            </div>
          ))}
        </div>

        {/* FAQ link */}
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#302218', margin: '0 0 4px' }}>
          Ofte stillede spørgsmål
        </h2>
        <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 20px', lineHeight: 1.6 }}>
          Svar på de mest almindelige spørgsmål om strik og garn.
        </p>
        <Link
          href="/faq"
          style={{
            display: 'inline-block', padding: '12px 24px',
            background: '#61846D', color: '#fff', borderRadius: 24,
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Gå til FAQ →
        </Link>
      </div>
    </div>
  )
}
