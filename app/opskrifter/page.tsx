import type { Metadata } from 'next'
import EksempelGrid from './EksempelGrid'

export const metadata: Metadata = {
  title: 'Opskrifter — Striq',
  description: 'Strikkeopskrifter fra begynder til avanceret — se eksempler og bidrag som designer.',
}

const C = {
  bg:        '#F8F3EE',
  text:      '#302218',
  textMuted: '#8C7E74',
  sage:      '#61846D',
  sageDark:  '#4A6956',
  dustyPink: '#D4ADB6',
  accent:    '#D9BFC3',
  border:    '#E5DDD9',
  white:     '#FFFFFF',
}

const PRINCIPPER = [
  {
    emoji: '🔗',
    titel: 'Eksterne opskrifter henvises, ikke kopieres',
    tekst: 'Vi viser titel, billede, garn og pindstørrelse — klik sender dig videre til designerens eller fabrikantens egen side. Vi republicerer aldrig instruktionsteksten uden aftale.',
  },
  {
    emoji: '🧵',
    titel: 'Garn kobles til dit lager',
    tekst: 'Når du ser en opskrift viser STRIQ automatisk, om du har det rigtige garn hjemme — eller foreslår alternativer fra vores katalog.',
  },
  {
    emoji: '🎨',
    titel: 'Egne opskrifter hostes fuldt',
    tekst: 'Har du selv designet — enten som hobby eller professionelt — kan du lægge din opskrift direkte på STRIQ, med eller uden betaling.',
  },
  {
    emoji: '💛',
    titel: 'Kreditering altid synlig',
    tekst: 'Designerens navn, link og eventuelle vilkår står tydeligt på hvert opskriftskort. Altid.',
  },
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
          margin: '0 auto 6px', maxWidth: 620, lineHeight: 1.55,
          opacity: 0.9,
        }}>
          Find inspiration, se hvilket garn du skal bruge fra dit lager — og start dit næste projekt med ét klik.
        </p>
        <div style={{
          display: 'inline-block',
          marginTop: 14,
          background: `${C.white}CC`,
          color: C.text,
          fontSize: 12.5,
          fontWeight: 500,
          padding: '6px 14px',
          borderRadius: 20,
          letterSpacing: '.02em',
        }}>
          Demo — eksempel-opskrifter vist nedenfor
        </div>
      </div>

      {/* Eksempel-kort (client-komponent — håndterer favoritter) */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 24px' }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(22px, 3vw, 28px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 8px',
          textAlign: 'center',
        }}>
          Sådan vil opskrifter se ud
        </h2>
        <p style={{
          fontSize: 14.5,
          color: C.textMuted,
          textAlign: 'center',
          maxWidth: 560,
          margin: '0 auto 32px',
          lineHeight: 1.6,
        }}>
          Eksemplerne nedenfor viser, hvordan STRIQ præsenterer både eksterne opskrifter (med link til designer)
          og opskrifter, du selv har lagt op. Prøv at klikke på hjertet — dine favoritter gemmes i browseren.
        </p>

        <EksempelGrid />
      </div>

      {/* Principper */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 24px' }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(22px, 3vw, 28px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 24px',
          textAlign: 'center',
        }}>
          Sådan tænker vi opskrifter i STRIQ
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {PRINCIPPER.map((p, i) => (
            <div key={i} style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ fontSize: 26 }}>{p.emoji}</div>
              <h3 style={{
                fontSize: 15,
                fontWeight: 600,
                color: C.text,
                margin: 0,
                lineHeight: 1.35,
              }}>
                {p.titel}
              </h3>
              <p style={{
                fontSize: 13.5,
                color: C.textMuted,
                lineHeight: 1.6,
                margin: 0,
              }}>
                {p.tekst}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Til designere og fabrikanter */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 24px 56px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.sage} 0%, ${C.sageDark} 100%)`,
          borderRadius: 16,
          padding: '36px 32px',
          color: C.white,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✨</div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(22px, 3vw, 28px)',
            fontWeight: 600,
            margin: '0 0 12px',
          }}>
            Er du designer eller garnfabrikant?
          </h2>
          <p style={{
            fontSize: 14.5,
            lineHeight: 1.7,
            margin: '0 auto 20px',
            maxWidth: 560,
            opacity: 0.95,
          }}>
            Vi vil rigtig gerne vise dine opskrifter i STRIQ — på den måde, der passer dig bedst.
            Har du allerede dine opskrifter liggende på din egen side, sender vi bare brugerne direkte til dig.
            Vil du gerne sælge eller dele dine opskrifter gennem STRIQ, kan vi også det.
          </p>
          <a
            href="mailto:hej@striq.dk?subject=Samarbejde%20om%20opskrifter%20i%20STRIQ"
            style={{
              display: 'inline-block',
              background: C.white,
              color: C.sageDark,
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 22px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Skriv til os på hej@striq.dk
          </a>
        </div>
      </div>

      {/* Til brugere */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 24px 72px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.accent} 0%, ${C.dustyPink}66 100%)`,
          borderRadius: 12,
          padding: '24px 28px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: C.text, margin: '0 0 8px', lineHeight: 1.6 }}>
            Har du en opskrift-favorit, vi bør kende? Eller en idé til hvad du savner?
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
