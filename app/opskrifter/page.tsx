'use client'

import { useState } from 'react'

const LEVELS = ['Alle', 'Begynder', 'Øvet', 'Avanceret']

const OPSKRIFTER = [
  { titel: 'Enkel ribhue', niveau: 'Begynder', fiber: 'Merinould', tid: '4–6 timer', emoji: '🧢', farve: '#61846D' },
  { titel: 'Stripet tørklæde', niveau: 'Begynder', fiber: 'Alpaka/uld', tid: '6–10 timer', emoji: '🧣', farve: '#D4ADB6' },
  { titel: 'Sæsonvanter', niveau: 'Begynder', fiber: 'Ekstra fin merino', tid: '8–12 timer', emoji: '🧤', farve: '#D9BFC3' },
  { titel: 'Klassisk raglantrøje', niveau: 'Øvet', fiber: 'Lamsuld', tid: '3–5 uger', emoji: '🧥', farve: '#61846D' },
  { titel: 'Boblechek-bluse', niveau: 'Øvet', fiber: 'Bomuldsgarn', tid: '2–4 uger', emoji: '👕', farve: '#D4ADB6' },
  { titel: 'Kabelstrikket cardigan', niveau: 'Øvet', fiber: 'Merino DK', tid: '4–7 uger', emoji: '🧶', farve: '#D9BFC3' },
  { titel: 'Fairisle-sweater', niveau: 'Avanceret', fiber: 'Shetlandsuld', tid: '6–10 uger', emoji: '❄️', farve: '#61846D' },
  { titel: 'Lacesjal med bladmønster', niveau: 'Avanceret', fiber: 'Kidsilke', tid: '3–6 uger', emoji: '🍃', farve: '#D4ADB6' },
]

export default function OpskrifterPage() {
  const [aktivtNiveau, setAktivtNiveau] = useState('Alle')
  const [søgning, setSøgning] = useState('')

  const filtrerede = OPSKRIFTER.filter(o => {
    const niveauMatch = aktivtNiveau === 'Alle' || o.niveau === aktivtNiveau
    const søgMatch = o.titel.toLowerCase().includes(søgning.toLowerCase()) || o.fiber.toLowerCase().includes(søgning.toLowerCase())
    return niveauMatch && søgMatch
  })

  return (
    <div className="font-sans">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(97,132,109,.2) 0%, #D9BFC3 100%)', padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, color: '#302218', margin: '0 0 10px' }}>
          Opskrifter
        </h1>
        <p style={{ fontSize: 15, color: '#8C7E74', margin: '0 auto', maxWidth: 480, lineHeight: 1.65 }}>
          Browse vores samling af strikkeopskrifter — fra enkle begynderprojekter til avancerede mønstre.
        </p>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 24px 64px' }}>
        {/* Filter + søg */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28 }}>
          <input
            type="text"
            placeholder="Søg på opskrift eller fiber…"
            value={søgning}
            onChange={e => setSøgning(e.target.value)}
            style={{
              flex: '1 1 220px', padding: '9px 14px',
              border: '1px solid #E5DDD9', borderRadius: 8,
              fontSize: 13.5, fontFamily: "'DM Sans', sans-serif",
              color: '#302218', background: '#FFFFFF', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {LEVELS.map(l => (
              <button key={l} onClick={() => setAktivtNiveau(l)} style={{
                padding: '8px 16px', borderRadius: 20,
                border: `1px solid ${aktivtNiveau === l ? '#9B6272' : '#E5DDD9'}`,
                background: aktivtNiveau === l ? '#9B6272' : '#FFFFFF',
                color: aktivtNiveau === l ? '#fff' : '#8C7E74',
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer', fontWeight: aktivtNiveau === l ? 500 : 400,
                transition: 'all .15s',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Opskrift-kort */}
        {filtrerede.length === 0 ? (
          <p style={{ color: '#8C7E74', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
            Ingen opskrifter matcher din søgning.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {filtrerede.map((o, i) => (
              <OpskriftKort key={i} o={o} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 48, background: '#FFFFFF', border: '1px dashed #E5DDD9', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 6px' }}>Mangler du en bestemt opskrift?</p>
          <p style={{ fontSize: 13, color: '#8C7E74', margin: 0 }}>
            Vi udvider løbende samlingen — skriv til os hvis du har ønsker eller vil bidrage med egne opskrifter.
          </p>
        </div>
      </div>
    </div>
  )
}

function OpskriftKort({ o }: { o: typeof OPSKRIFTER[0] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF', border: '1px solid #E5DDD9',
        borderTop: `3px solid ${o.farve}`, borderRadius: 12,
        padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: hovered ? '0 6px 20px rgba(48,34,24,.10)' : '0 1px 4px rgba(48,34,24,.05)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
      }}
    >
      <span style={{ fontSize: 32 }}>{o.emoji}</span>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 600, color: '#302218', margin: 0 }}>
        {o.titel}
      </h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: '#fff', background: o.farve, borderRadius: 20, padding: '2px 9px', fontWeight: 500 }}>
          {o.niveau}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: '#8C7E74', margin: 0 }}>🪡 {o.fiber} · ⏱ {o.tid}</p>
      <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500, marginTop: 4 }}>Se opskrift →</span>
    </div>
  )
}
