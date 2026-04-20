'use client'

import { useEffect, useState } from 'react'

const C = {
  bg:        '#F8F3EE',
  text:      '#302218',
  textMuted: '#8C7E74',
  sage:      '#61846D',
  dustyPink: '#D4ADB6',
  accent:    '#D9BFC3',
  border:    '#E5DDD9',
  white:     '#FFFFFF',
  gold:      '#B89668',
  heart:     '#C25A6E',
}

type Opskrift = {
  id: string
  titel: string
  designer: string
  billedeEmoji: string
  garn: string
  pind: string
  svaerhedsgrad: 'Begynder' | 'Øvet' | 'Avanceret'
  pris: 'Gratis' | string
  kilde: 'ekstern' | 'egen'
  action: string
}

const EKSEMPEL_OPSKRIFTER: Opskrift[] = [
  {
    id: 'demo-sommer-raglan',
    titel: 'Eksempel Sommer-Raglan',
    designer: 'Ekstern designer',
    billedeEmoji: '🧥',
    garn: 'Filcolana Arwetta · 300 g',
    pind: '3,5 mm',
    svaerhedsgrad: 'Øvet',
    pris: 'Gratis',
    kilde: 'ekstern',
    action: 'Åbn hos designer',
  },
  {
    id: 'demo-efteraarssjal',
    titel: 'Eksempel Efterårssjal',
    designer: 'Ekstern designer',
    billedeEmoji: '🧣',
    garn: 'Drops Kid-Silk · 150 g',
    pind: '4,0 mm',
    svaerhedsgrad: 'Øvet',
    pris: 'Kr. 65',
    kilde: 'ekstern',
    action: 'Køb hos designer',
  },
  {
    id: 'demo-hannah-hue',
    titel: 'Hannahs Søndagshue',
    designer: 'STRIQ / Hannah',
    billedeEmoji: '🧢',
    garn: 'Permin Bella · 100 g',
    pind: '6,0 mm',
    svaerhedsgrad: 'Begynder',
    pris: 'Gratis',
    kilde: 'egen',
    action: 'Læs opskrift',
  },
  {
    id: 'demo-hannah-kabel',
    titel: 'Hannahs Kabeltrøje',
    designer: 'STRIQ / Hannah',
    billedeEmoji: '❄️',
    garn: 'CaMaRose Økologisk Hverdagsuld · 500 g',
    pind: '4,0 mm',
    svaerhedsgrad: 'Avanceret',
    pris: 'Kr. 80',
    kilde: 'egen',
    action: 'Køb og læs',
  },
]

const LS_KEY = 'striq.demo.opskrift.favoritter'

function laesFavoritter(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function gemFavoritter(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(ids))
  } catch {
    /* stille fejl — storage kan være fuld eller blokeret */
  }
}

function Badge({ tekst, farve, bg }: { tekst: string; farve: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color: farve,
      fontSize: 11.5,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      letterSpacing: '.03em',
    }}>
      {tekst}
    </span>
  )
}

function HjerteIkon({ fyldt }: { fyldt: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={fyldt ? C.heart : 'none'}
      stroke={fyldt ? C.heart : C.textMuted}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function OpskriftKort({
  o,
  erFavorit,
  onToggleFavorit,
}: {
  o: Opskrift
  erFavorit: boolean
  onToggleFavorit: (id: string) => void
}) {
  const erGratis = o.pris === 'Gratis'
  const erEkstern = o.kilde === 'ekstern'

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 2px 10px rgba(48,34,24,.05)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        top: 10, left: 10,
        background: `${C.text}CC`,
        color: C.white,
        fontSize: 10,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 4,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        zIndex: 1,
      }}>
        Eksempel
      </div>

      <button
        type="button"
        onClick={() => onToggleFavorit(o.id)}
        aria-label={erFavorit ? `Fjern ${o.titel} fra favoritter` : `Gem ${o.titel} som favorit`}
        aria-pressed={erFavorit}
        style={{
          position: 'absolute',
          top: 10, right: 10,
          background: `${C.white}EE`,
          border: `1px solid ${C.border}`,
          borderRadius: '50%',
          width: 40, height: 40,
          minWidth: 44, minHeight: 44,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1,
          boxShadow: '0 1px 4px rgba(48,34,24,.08)',
        }}
      >
        <HjerteIkon fyldt={erFavorit} />
      </button>

      <div style={{
        background: `linear-gradient(135deg, ${C.accent}88 0%, ${C.dustyPink}55 100%)`,
        height: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 72,
      }}>
        {o.billedeEmoji}
      </div>

      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge
            tekst={erEkstern ? 'Ekstern' : 'STRIQ'}
            farve={erEkstern ? C.sage : C.gold}
            bg={erEkstern ? `${C.sage}18` : `${C.gold}20`}
          />
          <Badge
            tekst={o.pris}
            farve={erGratis ? C.sage : C.text}
            bg={erGratis ? `${C.sage}18` : `${C.accent}55`}
          />
          <Badge tekst={o.svaerhedsgrad} farve={C.textMuted} bg={C.bg} />
        </div>

        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20, fontWeight: 600,
          color: C.text, margin: 0, lineHeight: 1.25,
        }}>
          {o.titel}
        </h3>

        <div style={{ fontSize: 12.5, color: C.textMuted }}>
          af {o.designer}
        </div>

        <div style={{
          borderTop: `1px solid ${C.border}`,
          paddingTop: 10,
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontSize: 13,
          color: C.text,
        }}>
          <div><span style={{ color: C.textMuted }}>Garn:</span> {o.garn}</div>
          <div><span style={{ color: C.textMuted }}>Pind:</span> {o.pind}</div>
        </div>

        <button
          type="button"
          disabled
          style={{
            marginTop: 'auto',
            background: erEkstern ? C.white : C.sage,
            color: erEkstern ? C.sage : C.white,
            border: `1.5px solid ${C.sage}`,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'not-allowed',
            opacity: 0.85,
            fontFamily: 'inherit',
          }}
          aria-label={`${o.action} (demo — knappen er ikke aktiv)`}
        >
          {o.action} {erEkstern ? '↗' : '→'}
        </button>
      </div>
    </div>
  )
}

export default function EksempelGrid() {
  const [favoritter, setFavoritter] = useState<Set<string>>(() => new Set())
  const [hydreret, setHydreret] = useState(false)

  useEffect(() => {
    setFavoritter(new Set(laesFavoritter()))
    setHydreret(true)
  }, [])

  const toggleFavorit = (id: string) => {
    setFavoritter((forrige) => {
      const ny = new Set(forrige)
      if (ny.has(id)) ny.delete(id)
      else ny.add(id)
      gemFavoritter([...ny])
      return ny
    })
  }

  const antalFavoritter = favoritter.size

  return (
    <>
      {hydreret && antalFavoritter > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            textAlign: 'center',
            marginBottom: 20,
            fontSize: 13,
            color: C.textMuted,
          }}
        >
          Du har gemt <strong style={{ color: C.heart }}>{antalFavoritter}</strong>{' '}
          {antalFavoritter === 1 ? 'opskrift' : 'opskrifter'} som favorit i denne browser.
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
      }}>
        {EKSEMPEL_OPSKRIFTER.map((o) => (
          <OpskriftKort
            key={o.id}
            o={o}
            erFavorit={favoritter.has(o.id)}
            onToggleFavorit={toggleFavorit}
          />
        ))}
      </div>

      <p style={{
        fontSize: 12.5,
        color: C.textMuted,
        textAlign: 'center',
        marginTop: 24,
        lineHeight: 1.6,
        fontStyle: 'italic',
      }}>
        ℹ️ Favoritter gemmes lige nu kun i din browser. Efter lanceringen vil dine favoritter
        blive gemt på din konto og fulgt på tværs af enheder.
      </p>
    </>
  )
}
