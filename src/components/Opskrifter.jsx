// Opskrifter — browseable samling af strikkeopskrifter
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

const LEVELS = ['Alle', 'Begynder', 'Øvet', 'Avanceret']

const OPSKRIFTER = [
  { titel: 'Enkel ribhue', niveau: 'Begynder', fiber: 'Merinould', tid: '4–6 timer', emoji: '🧢', farve: C.sage },
  { titel: 'Stripet tørklæde', niveau: 'Begynder', fiber: 'Alpaka/uld', tid: '6–10 timer', emoji: '🧣', farve: C.dustyPink },
  { titel: 'Sæsonvanter', niveau: 'Begynder', fiber: 'Ekstra fin merino', tid: '8–12 timer', emoji: '🧤', farve: C.accent },
  { titel: 'Klassisk raglantrøje', niveau: 'Øvet', fiber: 'Lamsuld', tid: '3–5 uger', emoji: '🧥', farve: C.sage },
  { titel: 'Boblechek-bluse', niveau: 'Øvet', fiber: 'Bomuldsgarn', tid: '2–4 uger', emoji: '👕', farve: C.dustyPink },
  { titel: 'Kabelstrikket cardigan', niveau: 'Øvet', fiber: 'Merino DK', tid: '4–7 uger', emoji: '🧶', farve: C.accent },
  { titel: 'Fairisle-sweater', niveau: 'Avanceret', fiber: 'Shetlandsuld', tid: '6–10 uger', emoji: '❄️', farve: C.sage },
  { titel: 'Lacesjal med bladmønster', niveau: 'Avanceret', fiber: 'Kidsilke', tid: '3–6 uger', emoji: '🍃', farve: C.dustyPink },
]

export default function Opskrifter() {
  const [aktivtNiveau, setAktivtNiveau] = useState('Alle')
  const [søgning, setSøgning] = useState('')

  const filtrerede = OPSKRIFTER.filter(o => {
    const niveauMatch = aktivtNiveau === 'Alle' || o.niveau === aktivtNiveau
    const søgMatch = o.titel.toLowerCase().includes(søgning.toLowerCase()) || o.fiber.toLowerCase().includes(søgning.toLowerCase())
    return niveauMatch && søgMatch
  })

  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Hero-banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.sage}33 0%, ${C.accent} 100%)`,
        padding: '48px 24px 40px',
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
        <p style={{ fontSize: 15, color: C.textMuted, margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
          Browse vores samling af strikkeopskrifter — fra enkle begynderprojekter til avancerede mønstre.
        </p>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 24px 64px' }}>

        {/* Filter + søg */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28 }}>
          {/* Søgefelt */}
          <input
            type="text"
            placeholder="Søg på opskrift eller fiber…"
            value={søgning}
            onChange={e => setSøgning(e.target.value)}
            style={{
              flex: '1 1 220px',
              padding: '9px 14px',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 13.5,
              fontFamily: "'DM Sans', sans-serif",
              color: C.text,
              background: C.cardBg,
              outline: 'none',
            }}
          />
          {/* Niveau-knapper */}
          <div style={{ display: 'flex', gap: 6 }}>
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setAktivtNiveau(l)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: `1px solid ${aktivtNiveau === l ? C.link : C.border}`,
                  background: aktivtNiveau === l ? C.link : C.cardBg,
                  color: aktivtNiveau === l ? '#fff' : C.textMuted,
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  fontWeight: aktivtNiveau === l ? 500 : 400,
                  transition: 'all .15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Opskrift-kort */}
        {filtrerede.length === 0 ? (
          <p style={{ color: C.textMuted, textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
            Ingen opskrifter matcher din søgning.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}>
            {filtrerede.map((o, i) => (
              <div key={i} style={{
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderTop: `3px solid ${o.farve}`,
                borderRadius: 12,
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: '0 1px 4px rgba(48,34,24,.05)',
                cursor: 'pointer',
                transition: 'transform .15s, box-shadow .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(48,34,24,.10)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(48,34,24,.05)' }}
              >
                <span style={{ fontSize: 32 }}>{o.emoji}</span>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 19, fontWeight: 600,
                  color: C.text, margin: 0,
                }}>
                  {o.titel}
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: '#fff', background: o.farve, borderRadius: 20, padding: '2px 9px', fontWeight: 500 }}>
                    {o.niveau}
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0 }}>
                  🪡 {o.fiber} · ⏱ {o.tid}
                </p>
                <span style={{ fontSize: 12.5, color: C.link, fontWeight: 500, marginTop: 4 }}>
                  Se opskrift →
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Kom-snart-boks */}
        <div style={{
          marginTop: 48,
          background: C.cardBg,
          border: `1px dashed ${C.border}`,
          borderRadius: 12,
          padding: '28px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: C.textMuted, margin: '0 0 6px' }}>
            Mangler du en bestemt opskrift?
          </p>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
            Vi udvider løbende samlingen — skriv til os hvis du har ønsker eller vil bidrage med egne opskrifter.
          </p>
        </div>
      </div>
    </div>
  )
}
