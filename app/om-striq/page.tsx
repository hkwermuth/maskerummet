'use client'

import { useState } from 'react'

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

const HVAD_PUNKTER = [
  { emoji: '🧶', tekst: 'holde styr på dit garnlager' },
  { emoji: '✨', tekst: 'se, hvad dit garn kan bruges til' },
  { emoji: '📒', tekst: 'gemme opskrifter og projekter – sammen med dine egne noter' },
  { emoji: '🔄', tekst: 'finde alternative garner, hvis det originale er svært at få fat i eller for dyrt' },
  { emoji: '📅', tekst: 'opdage relevante strikkeevents og inspiration' },
  { emoji: '🎓', tekst: 'få hjælp gennem guides, videoer og forklaringer' },
  { emoji: '🎨', tekst: 'lege med farver, kombinationer og AI baserede forslag' },
]

const VAERDIER = [
  {
    emoji: '✨',
    titel: 'Nørdet orden',
    tekst: 'STRIQ er født ud af Lean tankegangen og 5S metoden. Vi tror på overblik og struktur – ikke for strukturens skyld, men fordi det frigør tid og energi til fordybelse og strikkeglæde.',
  },
  {
    emoji: '🎨',
    titel: 'Kreativ leg',
    tekst: 'Strik er farver, former og frihed. STRIQ skal inspirere og åbne muligheder – uanset om du følger opskrifter slavisk eller bruger dem som udgangspunkt.',
  },
  {
    emoji: '🤝',
    titel: 'Teknologi med omtanke',
    tekst: 'AI og digitale værktøjer skal ikke erstatte strikningen. De skal understøtte den. STRIQ bruger teknologi som et redskab, ikke som et mål i sig selv.',
  },
  {
    emoji: '🧵',
    titel: 'Respekt for håndværket',
    tekst: 'Vi står på skuldrene af dem, der lærte os at strikke. STRIQ hylder traditionen, håndværket og historien – samtidig med at vi er nysgerrige på nye måder at arbejde med dem på.',
  },
]

const FAQ = [
  {
    q: 'Er STRIQ gratis?',
    a: 'Grundfunktionerne er gratis. Vi tilbyder premium-funktioner som AI-farvevisualisering for abonnenter og lagerplads ud over dine første 25 garner og 10 projekter.',
  },
  {
    q: 'Kan jeg dele mine projekter?',
    a: 'Du kan desværre ikke dele dine projekter, da STRIQ giver mulighed for at du kan gemme opskrifterne du har strikket efter – og de er ophavsretligt beskyttede.',
  },
]

function FaqModal({ onClose }: { onClose: () => void }) {
  const [openIndex, setOpenIndex] = useState(0)
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(30,18,12,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        position: 'relative', maxWidth: 560, width: '100%',
        background: '#FFFCF7', borderRadius: 16,
        padding: '36px 32px 32px',
        boxShadow: '0 20px 60px rgba(48,34,24,.25)',
        maxHeight: '88vh', overflowY: 'auto',
      }}>
        <button
          onClick={onClose}
          aria-label="Luk"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(48,34,24,0.06)', border: 'none',
            cursor: 'pointer', fontSize: 18, color: '#5A4E42',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28, fontWeight: 600, color: C.text,
          margin: '0 0 8px',
        }}>
          Ofte stillede spørgsmål
        </h2>
        <p style={{ fontSize: 13.5, color: C.textMuted, margin: '0 0 22px' }}>
          Det folk oftest gerne vil vide.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQ.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div key={i} style={{
                border: `1px solid ${C.border}`, borderRadius: 10,
                background: isOpen ? '#F8F3EE' : '#FFFFFF',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, fontWeight: 500, color: C.text,
                  }}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span style={{ fontSize: 18, color: C.link, lineHeight: 1, flexShrink: 0 }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', fontSize: 13.5, color: C.textMuted, lineHeight: 1.65 }}>
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function OmStriqPage() {
  const [showFaq, setShowFaq] = useState(false)

  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.dustyPink} 0%, ${C.sage}55 100%)`,
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(32px, 4.5vw, 48px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 12px',
          letterSpacing: '.01em',
        }}>
          Om STRIQ
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontStyle: 'italic',
          color: C.text,
          margin: '0 auto', maxWidth: 600, lineHeight: 1.55,
          opacity: 0.85,
        }}>
          Et digitalt værktøj for strikkere, der elsker både orden og kreativitet.
        </p>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 24px' }}>
        {/* Manifest-intro */}
        <p style={{ fontSize: 17, color: C.text, lineHeight: 1.75, margin: '0 0 22px' }}>
          STRIQ er skabt til dig, der elsker garn og projekter – og som gerne vil bruge mere tid på at strikke og mindre tid på at lede, tælle og tvivle. STRIQ forener orden og kreativitet i et digitalt værktøj, der giver overblik, inspiration og nye muligheder i det, du allerede har. Teknologi bruges her som en stille hjælper, der gør strikkelivet lettere, mere roligt og mere legende.
        </p>
        <p style={{ fontSize: 17, color: C.text, lineHeight: 1.75, margin: 0 }}>
          STRIQ udspringer af ønsket om at skabe struktur uden at tage sjælen ud af strikningen. Et sted hvor du kan tænke klart, blive inspireret og træffe bedre valg – uden at starte forfra hver gang.
        </p>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 24px 72px' }}>

        {/* Hvad STRIQ skal være */}
        <section style={{ margin: '48px 0 56px' }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600,
            color: C.text, margin: '0 0 12px', textAlign: 'center',
          }}>
            Hvad STRIQ skal være
          </h2>
          <p style={{ fontSize: 15, color: C.textMuted, margin: '0 auto 28px', maxWidth: 600, lineHeight: 1.7, textAlign: 'center' }}>
            STRIQ er et værktøj og et univers for strikkere, der gerne vil have overblik – og plads til kreativitet. I STRIQ kan du blandt andet:
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            {HVAD_PUNKTER.map((p, i) => (
              <div key={i} style={{
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 1px 3px rgba(48,34,24,.04)',
              }}>
                <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{p.emoji}</div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>{p.tekst}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, color: C.textMuted, margin: 0, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.7 }}>
            STRIQ skal ikke diktere, hvordan du strikker – men give dig et bedre udgangspunkt for at vælge selv.
          </p>
        </section>

        {/* Hvordan STRIQ blev til */}
        <section style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 'clamp(28px, 4vw, 44px)',
          marginBottom: 48,
          boxShadow: '0 2px 10px rgba(48,34,24,.05)',
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 600,
            color: C.text, margin: '0 0 18px',
          }}>
            Hvordan STRIQ blev til
          </h2>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: '0 0 14px' }}>
            STRIQ begyndte som en klassisk oprydning.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: '0 0 14px' }}>
            Med min baggrund som Lean konsulent ville jeg lave en 5S oprydning af mit eget garnlager: skabe orden, overblik og flow. Først fysisk. Så digitalt.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: '0 0 14px' }}>
            Herefter tog idéerne form. Hvis garnet var i en database, kunne jeg søge i det. Matche det med opskrifter. Se alternativer. Og lege med mulighederne.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: '0 0 14px' }}>
            Da jeg begyndte at arbejde med AI – både som sparring og byggeværktøj – stod det klart, at STRIQ kunne blive mere end et system. Det blev et projekt, hvor struktur og kreativitet forstærker hinanden.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: 0 }}>
            I dag er STRIQ blevet den type projekt, hvor jeg glemmer tid og sted, fordi jeg tydeligt kan se, hvor meget ro, overblik og strikkeglæde det kan give andre – præcis det, jeg selv har savnet.
          </p>
        </section>

        {/* Hvem står bag STRIQ */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 600,
            color: C.text, margin: '0 0 24px', textAlign: 'center',
          }}>
            Hvem står bag STRIQ
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 160px) 1fr',
            gap: 28,
            alignItems: 'start',
            maxWidth: 760,
            margin: '0 auto',
          }} className="om-portrait-grid">
            <div style={{
              width: '100%', aspectRatio: '1 / 1',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(48,34,24,.12)',
              background: `linear-gradient(135deg, ${C.dustyPink} 0%, ${C.sage}66 100%)`,
            }}>
              <img
                src="/brand/hannah.jpg.JPEG"
                alt="Hannah Kamstrup Wermuth"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: '70% 30%',
                  display: 'block',
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: '0 0 14px' }}>
                STRIQ er skabt af mig, Hannah Kamstrup Wermuth. Min egen strikkerejse begyndte i slutningen af 1970&apos;erne, hvor jeg lærte at strikke af min elskede farmor. Siden har jeg strikket mig gennemårtiernes trends og teknikker: hønsestrik, skrå bluser med angora og sølvtråd, flagermusærmer, norske og islandske sweatre, tørklæder, vanter, huer, moderne bluser, nederdele – og meget mere.
              </p>
              <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: 0 }}>
                Jeg har altid flere projekter i gang og en vedvarende lyst til at lære nyt, prøve nye teknikker og arbejde med forskellige typer garn. STRIQ er i mange henseender en naturlig forlængelse af den nysgerrighed.
              </p>
            </div>
          </div>
        </section>

        {/* Vores værdier */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600,
            color: C.text, margin: '0 0 28px', textAlign: 'center',
          }}>
            Vores værdier
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {VAERDIER.map((v, i) => (
              <div key={i} style={{
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${i % 2 === 0 ? C.sage : C.dustyPink}`,
                borderRadius: 12,
                padding: '22px 22px 20px',
                boxShadow: '0 1px 4px rgba(48,34,24,.04)',
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{v.emoji}</div>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20, fontWeight: 600,
                  color: C.text, margin: '0 0 8px',
                }}>
                  {v.titel}
                </h3>
                <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0, lineHeight: 1.65 }}>
                  {v.tekst}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ trigger */}
        <section style={{ textAlign: 'center', marginBottom: 48 }}>
          <button
            onClick={() => setShowFaq(true)}
            style={{
              background: '#FFFFFF',
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 14.5, fontWeight: 500,
              color: C.text, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 2px 8px rgba(48,34,24,.06)',
              transition: 'transform .15s, box-shadow .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(48,34,24,.10)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(48,34,24,.06)' }}
          >
            Ofte stillede spørgsmål →
          </button>
        </section>

        {/* Kontakt */}
        <section style={{
          background: `linear-gradient(135deg, ${C.accent} 0%, ${C.dustyPink}66 100%)`,
          borderRadius: 16,
          padding: '36px 32px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26, fontWeight: 600,
            color: C.text, margin: '0 0 10px',
          }}>
            Kontakt STRIQ
          </h2>
          <p style={{ fontSize: 15, color: C.text, margin: '0 0 18px', lineHeight: 1.65, opacity: 0.85 }}>
            Skriv en mail eller fang mig på Instagram.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="mailto:kontakt@striq.dk"
              style={{
                background: '#FFFFFF', color: C.text,
                padding: '10px 20px', borderRadius: 999,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 2px 8px rgba(48,34,24,.10)',
              }}
            >
              ✉️  kontakt@striq.dk
            </a>
            <a
              href="https://instagram.com/nellyeknit"
              target="_blank" rel="noopener noreferrer"
              style={{
                background: '#FFFFFF', color: C.text,
                padding: '10px 20px', borderRadius: 999,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 2px 8px rgba(48,34,24,.10)',
              }}
            >
              📷  @nellyeknit
            </a>
          </div>
        </section>

      </div>

      {showFaq && <FaqModal onClose={() => setShowFaq(false)} />}
    </div>
  )
}
