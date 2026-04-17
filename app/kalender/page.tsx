'use client'

import { useState } from 'react'

const KATEGORIER = ['Alle', 'Workshop', 'Meetup', 'Online', 'Festival']

const EVENTS = [
  {
    dato: '28. april 2026', ugedag: 'Tirsdag',
    titel: 'Begynder-workshop: Ribbenstrik',
    sted: 'Garnbutikken, Nørrebro · København',
    type: 'Workshop', farve: '#61846D',
    beskrivelse: 'Lær ribbenstrik fra bunden — pinde og garn medbringes. Maks 10 deltagere.',
  },
  {
    dato: '3. maj 2026', ugedag: 'Søndag',
    titel: 'Strikke-meetup i parken',
    sted: 'Fælledparken · København',
    type: 'Meetup', farve: '#D4ADB6',
    beskrivelse: 'Hyggelig strikkesamling under åben himmel — alle niveauer velkomne. Medbring dit projekt.',
  },
  {
    dato: '10. maj 2026', ugedag: 'Lørdag',
    titel: 'Online Q&A: Kabelstrik',
    sted: 'Zoom · Online',
    type: 'Online', farve: '#D9BFC3',
    beskrivelse: 'Stil dine spørgsmål om kabelstrik til erfarne strikkere. Tilmelding via hjemmesiden.',
  },
  {
    dato: '17. maj 2026', ugedag: 'Søndag',
    titel: 'Garnfestival Aarhus 2026',
    sted: 'Aarhus Rådhus · Aarhus',
    type: 'Festival', farve: '#61846D',
    beskrivelse: 'Årets største garnfestival med over 40 udstillere, workshops og live-demonstrationer.',
  },
  {
    dato: '24. maj 2026', ugedag: 'Søndag',
    titel: 'Avanceret workshop: Fairisle-teknik',
    sted: 'Strikkestuen · Frederiksberg',
    type: 'Workshop', farve: '#61846D',
    beskrivelse: 'Dyb-dyk i Fairisle-mønstre og flerfarvestrik. Forudsætter grundlæggende strikkekendskab.',
  },
  {
    dato: '7. juni 2026', ugedag: 'Søndag',
    titel: 'Månedlig strikke-cirkel',
    sted: 'Biblioteket Østerbro · København',
    type: 'Meetup', farve: '#D4ADB6',
    beskrivelse: 'Fast månedligt treffpunkt for strikkeentusiaster. Kaffe og hygge inkluderet.',
  },
]

const TYPE_EMOJI: Record<string, string> = { Workshop: '🛠️', Meetup: '☕', Online: '💻', Festival: '🎪' }

export default function KalenderPage() {
  const [aktiv, setAktiv] = useState('Alle')
  const filtrerede = aktiv === 'Alle' ? EVENTS : EVENTS.filter(e => e.type === aktiv)

  return (
    <div className="font-sans">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #D9BFC3 0%, #D4ADB6 100%)', padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, color: '#302218', margin: '0 0 10px' }}>
          Kalender
        </h1>
        <p style={{ fontSize: 15, color: '#8C7E74', margin: '0 auto', maxWidth: 480, lineHeight: 1.65 }}>
          Find kommende strikke-events, workshops og meetups — i nærheden og online.
        </p>
      </div>

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '36px 24px 64px' }}>
        {/* Kategori-filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {KATEGORIER.map(k => (
            <button key={k} onClick={() => setAktiv(k)} style={{
              padding: '8px 18px', borderRadius: 20,
              border: `1px solid ${aktiv === k ? '#9B6272' : '#E5DDD9'}`,
              background: aktiv === k ? '#9B6272' : '#FFFFFF',
              color: aktiv === k ? '#fff' : '#8C7E74',
              fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer', fontWeight: aktiv === k ? 500 : 400,
              transition: 'all .15s',
            }}>
              {k !== 'Alle' && TYPE_EMOJI[k] + ' '}{k}
            </button>
          ))}
        </div>

        {/* Event-liste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtrerede.map((ev, i) => (
            <div key={i} style={{
              background: '#FFFFFF', border: '1px solid #E5DDD9',
              borderLeft: `4px solid ${ev.farve}`, borderRadius: 12,
              padding: '20px 22px',
              display: 'grid', gridTemplateColumns: 'auto 1fr',
              gap: '0 20px', boxShadow: '0 1px 4px rgba(48,34,24,.05)',
            }}>
              {/* Dato-kolonne */}
              <div style={{ textAlign: 'center', minWidth: 56, paddingTop: 2 }}>
                <div style={{ fontSize: 20, marginBottom: 2 }}>{TYPE_EMOJI[ev.type]}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: ev.farve, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {ev.ugedag.slice(0, 3)}
                </div>
                <div style={{ fontSize: 11, color: '#8C7E74', marginTop: 1 }}>
                  {ev.dato.split(' ').slice(0, 2).join(' ')}
                </div>
              </div>

              {/* Indhold */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#302218', margin: 0, flex: 1 }}>
                    {ev.titel}
                  </h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: ev.farve, borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap' }}>
                    {ev.type}
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: '#8C7E74', margin: '0 0 6px' }}>📍 {ev.sted}</p>
                <p style={{ fontSize: 13, color: '#302218', margin: '0 0 8px', lineHeight: 1.5 }}>{ev.beskrivelse}</p>
                <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500 }}>Læs mere →</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer boks */}
        <div style={{ marginTop: 40, background: '#FFFFFF', border: '1px dashed #E5DDD9', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 6px' }}>Arrangerer du et strikke-event?</p>
          <p style={{ fontSize: 13, color: '#8C7E74', margin: 0 }}>
            Skriv til os, så hjælper vi med at få det på kalenderen.
          </p>
        </div>
      </div>
    </div>
  )
}
