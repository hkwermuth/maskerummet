'use client'

import { useState, type ReactElement } from 'react'
import { FARVE, EVENTS, KATEGORIER, MAANED_RAEKKEFOLGE } from './events'

// ── SVG-ikoner ───────────────────────────────────────────────────────────────
function IkonGarn({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="1.4" />
      <path d="M4.5 9Q12 4 19.5 9"   stroke={c} strokeWidth="1.2" fill="none" />
      <path d="M3.5 13Q12 7.5 20.5 13" stroke={c} strokeWidth="1.2" fill="none" />
      <path d="M4.5 17Q12 11.5 19.5 17" stroke={c} strokeWidth="1.2" fill="none" />
    </svg>
  )
}

function IkonPinde({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <line x1="5" y1="19" x2="16.5" y2="5"  stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="4.5" r="2" fill={c} />
      <line x1="7.5" y1="5" x2="19" y2="19" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7.5" cy="4.5" r="2" fill={c} />
    </svg>
  )
}

function IkonMikrofon({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke={c} strokeWidth="1.4" />
      <path d="M5 11a7 7 0 0014 0" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <line x1="12" y1="18" x2="12" y2="22" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="9"  y1="22" x2="15" y2="22" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IkonHus({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M5 10.5V20h14V10.5" stroke={c} strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      <rect x="9.5" y="15" width="5" height="5" rx="0.5" stroke={c} strokeWidth="1.2" fill="none" />
    </svg>
  )
}

function IkonGlobus({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.4" />
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={c} strokeWidth="1.2" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={c} strokeWidth="1.2" />
      <path d="M5.5 7.5Q12 10 18.5 7.5M5.5 16.5Q12 14 18.5 16.5" stroke={c} strokeWidth="1" fill="none" />
    </svg>
  )
}

function IkonBolge({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M2 9s2.5-3 5-3 4.5 3 7 3 4.5-3 8-3"  stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M2 14s2.5-3 5-3 4.5 3 7 3 4.5-3 8-3" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M2 19s2.5-2 5-2 4.5 2 7 2 4.5-2 8-2" stroke={c} strokeWidth="1"   fill="none" strokeLinecap="round" />
    </svg>
  )
}

function IkonFaar({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <ellipse cx="13" cy="12.5" rx="7" ry="5" stroke={c} strokeWidth="1.4" />
      <circle cx="7" cy="10.5" r="3" stroke={c} strokeWidth="1.4" />
      <line x1="9"  y1="17.5" x2="8"  y2="21" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="17.5" x2="12" y2="21" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="15" y1="17.5" x2="15" y2="21" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="18" y1="17.5" x2="19" y2="21" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IkonVin({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M8 3h8L14 12a3 3 0 01-4 0L8 3" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="20" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="9"  y1="20" x2="15" y2="20" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IkonAnker({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="6" r="2.5" stroke={c} strokeWidth="1.4" />
      <line x1="12" y1="8.5" x2="12" y2="20" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 14c0 3.5 3 6 6 6s6-2.5 6-6" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <line x1="6"  y1="9.5" x2="18" y2="9.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IkonLotus({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 20c0 0-5-4-5-9a5 5 0 0110 0c0 5-5 9-5 9z" stroke={c} strokeWidth="1.4" fill="none" />
      <path d="M7 14C5 13 3 10 3 7a4 4 0 018 2"   stroke={c} strokeWidth="1.2" fill="none" />
      <path d="M17 14c2-1 4-4 4-7a4 4 0 00-8 2"   stroke={c} strokeWidth="1.2" fill="none" />
    </svg>
  )
}

function IkonFyrtar({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M9 21V8l3-5 3 5v13H9z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <line x1="8"  y1="21" x2="16" y2="21" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="9"  y1="12" x2="15" y2="12" stroke={c} strokeWidth="1.2" />
      <line x1="9"  y1="15" x2="15" y2="15" stroke={c} strokeWidth="1.2" />
      <path d="M11 3L9.5 1.5M13 3l1.5-1.5M12 3V1" stroke={c} strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function IkonSiv({ c }: { c: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="22" x2="12" y2="9"  stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8"  y1="22" x2="8"  y2="11" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="16" y1="22" x2="16" y2="11" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="12" cy="7"   rx="1.5" ry="3"   fill={c} />
      <ellipse cx="8"  cy="8.5" rx="1.2" ry="2.5" fill={c} />
      <ellipse cx="16" cy="8.5" rx="1.2" ry="2.5" fill={c} />
    </svg>
  )
}

// ── Ikonmap ──────────────────────────────────────────────────────────────────
const IKONER: Record<string, (c: string) => ReactElement> = {
  garn:     c => <IkonGarn c={c} />,
  pinde:    c => <IkonPinde c={c} />,
  mikrofon: c => <IkonMikrofon c={c} />,
  hus:      c => <IkonHus c={c} />,
  globus:   c => <IkonGlobus c={c} />,
  bolge:    c => <IkonBolge c={c} />,
  faar:     c => <IkonFaar c={c} />,
  vin:      c => <IkonVin c={c} />,
  anker:    c => <IkonAnker c={c} />,
  lotus:    c => <IkonLotus c={c} />,
  fyrtar:   c => <IkonFyrtar c={c} />,
  siv:      c => <IkonSiv c={c} />,
}

// ── Billetter-badge farver ───────────────────────────────────────────────────
function billetStyle(b: string): { bg: string; txt: string } {
  if (b === 'Udsolgt')                              return { bg: '#F5E4E4', txt: '#7A2020' }
  if (b === 'Få pladser' || b === 'Sælger hurtigt ud' || b === 'Tilmelding senest 21. jul')
                                                    return { bg: '#FBF0DC', txt: '#6A4010' }
  return { bg: '#E4F0E8', txt: '#2E6040' }
}

// ── Er farven lys? (afgør om tekst skal være mørk) ──────────────────────────
function erLys(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 155
}

// Events, KATEGORIER og MAANED_RAEKKEFOLGE er flyttet til ./events.ts så
// forsiden også kan importere data uden at trække React-afhængighederne med.
// Kalenderen viser fremtidige events ~12 måneder frem.
// Forbi-events fjernes ved hver opdatering.

// ── Komponent ────────────────────────────────────────────────────────────────
export default function KalenderPage() {
  const [aktiv, setAktiv] = useState('Alle')

  const filtrerede = aktiv === 'Alle' ? EVENTS : EVENTS.filter(e => e.type === aktiv)

  const grupperetEfterMaaned = MAANED_RAEKKEFOLGE.reduce<Record<string, typeof EVENTS>>(
    (acc, m) => {
      const events = filtrerede.filter(e => e.maaned === m)
      if (events.length > 0) acc[m] = events
      return acc
    }, {}
  )

  return (
    <div className="font-sans">

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #D9BFC3 0%, #D4ADB6 100%)',
        padding: '48px 24px 40px', textAlign: 'center',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
          <circle cx="12" cy="12" r="8.5" stroke="#302218" strokeWidth="1.4" opacity="0.5"/>
          <path d="M4.5 9Q12 4 19.5 9"    stroke="#302218" strokeWidth="1.2" fill="none" opacity="0.5"/>
          <path d="M3.5 13Q12 7.5 20.5 13" stroke="#302218" strokeWidth="1.2" fill="none" opacity="0.5"/>
          <path d="M4.5 17Q12 11.5 19.5 17" stroke="#302218" strokeWidth="1.2" fill="none" opacity="0.5"/>
        </svg>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600,
          color: '#302218', margin: '0 0 10px',
        }}>
          Kalender
        </h1>
        <p style={{ fontSize: 15, color: '#8C7E74', margin: '0 auto 8px', maxWidth: 480, lineHeight: 1.65 }}>
          Find kommende strikke-events, workshops, retreats og liveshows — i Danmark og Norden.
        </p>
        <p style={{ fontSize: 11.5, color: '#a09090' }}>Sidst opdateret: 8. maj 2026</p>
      </div>

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '36px 24px 64px' }}>

        {/* ── Kategori-filter ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
          {KATEGORIER.map(k => {
            const erAktiv = aktiv === k
            const dotFarve = k === 'Alle' ? undefined : FARVE[k]
            return (
              <button key={k} onClick={() => setAktiv(k)} style={{
                padding: '7px 16px', borderRadius: 20,
                border: `1px solid ${erAktiv ? (dotFarve ?? '#9B6272') : '#E5DDD9'}`,
                background: erAktiv ? (dotFarve ?? '#9B6272') : '#FFFFFF',
                color: erAktiv
                  ? (dotFarve && erLys(dotFarve) ? '#302218' : '#fff')
                  : '#8C7E74',
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer', fontWeight: erAktiv ? 600 : 400,
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {dotFarve && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: erAktiv
                      ? (erLys(dotFarve) ? 'rgba(48,34,24,0.25)' : 'rgba(255,255,255,0.5)')
                      : dotFarve,
                    display: 'inline-block', flexShrink: 0,
                  }} />
                )}
                {k}
              </button>
            )
          })}
        </div>

        {/* ── Events grupperet efter måned ── */}
        {MAANED_RAEKKEFOLGE.map(maaned => {
          const events = grupperetEfterMaaned[maaned]
          if (!events) return null
          return (
            <div key={maaned} style={{ marginBottom: 40 }}>

              {/* Måned-overskrift */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 16,
              }}>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20, fontWeight: 600, color: '#302218',
                  margin: 0, whiteSpace: 'nowrap',
                }}>
                  {maaned}
                </h2>
                <div style={{ flex: 1, height: 1, background: '#E5DDD9' }} />
              </div>

              {/* Event-kort */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {events.map((ev, i) => {
                  const bStyle = billetStyle(ev.billetter)
                  return (
                    <a
                      key={i}
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <div style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5DDD9',
                        borderLeft: `4px solid ${ev.farve}`,
                        borderRadius: 12,
                        padding: '18px 22px',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '0 20px',
                        boxShadow: '0 1px 4px rgba(48,34,24,.05)',
                        transition: 'box-shadow .15s, transform .15s',
                      }}
                        onMouseEnter={e => {
                          const t = e.currentTarget
                          t.style.boxShadow = '0 4px 14px rgba(48,34,24,.10)'
                          t.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          const t = e.currentTarget
                          t.style.boxShadow = '0 1px 4px rgba(48,34,24,.05)'
                          t.style.transform = 'translateY(0)'
                        }}
                      >

                        {/* Dato + ikon */}
                        <div style={{ textAlign: 'center', minWidth: 58, paddingTop: 2 }}>
                          <div style={{ marginBottom: 6 }}>
                            {IKONER[ev.ikon](ev.farve)}
                          </div>
                          <div style={{
                            fontSize: 10, fontWeight: 700, color: ev.farve,
                            textTransform: 'uppercase', letterSpacing: '.06em',
                          }}>
                            {ev.ugedag}
                          </div>
                          <div style={{ fontSize: 10, color: '#8C7E74', marginTop: 2, lineHeight: 1.3 }}>
                            {ev.dato}
                          </div>
                        </div>

                        {/* Indhold */}
                        <div>
                          <div style={{
                            display: 'flex', alignItems: 'flex-start',
                            gap: 8, flexWrap: 'wrap', marginBottom: 5,
                          }}>
                            <h3 style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              fontSize: 18, fontWeight: 600,
                              color: '#302218', margin: 0, flex: 1,
                            }}>
                              {ev.titel}
                            </h3>

                            {/* Type-badge */}
                            <span style={{
                              fontSize: 13, fontWeight: 700,
                              fontFamily: "'DM Sans', sans-serif",
                              letterSpacing: '.03em',
                              color: erLys(ev.farve) ? '#302218' : '#fff',
                              background: ev.farve, borderRadius: 20,
                              padding: '2px 10px', whiteSpace: 'nowrap',
                            }}>
                              {ev.type}
                            </span>

                            {/* Billetter-badge */}
                            <span style={{
                              fontSize: 13, fontWeight: 700,
                              fontFamily: "'DM Sans', sans-serif",
                              letterSpacing: '.03em',
                              color: bStyle.txt, background: bStyle.bg,
                              borderRadius: 20, padding: '2px 10px',
                              whiteSpace: 'nowrap',
                            }}>
                              {ev.billetter}
                            </span>
                          </div>

                          <p style={{ fontSize: 12.5, color: '#8C7E74', margin: '0 0 5px' }}>
                            📍 {ev.sted}
                          </p>
                          <p style={{ fontSize: 13, color: '#302218', margin: '0 0 8px', lineHeight: 1.55 }}>
                            {ev.beskrivelse}
                          </p>
                          <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500 }}>
                            Læs mere →
                          </span>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── Footer-boks ── */}
        <div style={{
          marginTop: 40, background: '#FFFFFF',
          border: '1px dashed #E5DDD9', borderRadius: 12,
          padding: '28px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 6px' }}>Arrangerer du et strikke-event?</p>
          <p style={{ fontSize: 13, color: '#8C7E74', margin: 0 }}>
            Skriv til os, så hjælper vi med at få det på kalenderen.
          </p>
        </div>

      </div>
    </div>
  )
}
