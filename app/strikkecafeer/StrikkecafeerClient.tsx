'use client'

import { useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { HeroIllustration } from '@/components/layout/HeroIllustration'
import type { StoreBase } from '@/lib/data/stores'
import type { DanmarksKortHandle } from '../find-forhandler/DanmarksKortClient'
import { eventsAtLokation } from '../kalender/events'

const DanmarksKort = dynamic(() => import('../find-forhandler/DanmarksKortClient'), {
  ssr: false,
  loading: () => <KortSkeleton />,
})

type Props = {
  initialCafes: StoreBase[]
}

// Group caféer pr. landsdel for hurtig orientering. Postnr-prefix → label.
// Holder os til samme inddeling som NORDA's danmarks-regioner (groft).
function regionForPostnr(pc: string | null): string {
  if (!pc) return 'Ukendt'
  const n = parseInt(pc, 10)
  if (isNaN(n)) return 'Ukendt'
  if (n >= 1000 && n <= 2999) return 'Hovedstaden'
  if (n >= 3000 && n <= 3699) return 'Nordsjælland'
  if (n >= 3700 && n <= 3799) return 'Bornholm'
  if (n >= 4000 && n <= 4999) return 'Sjælland & Lolland-Falster'
  if (n >= 5000 && n <= 5999) return 'Fyn'
  if (n >= 6000 && n <= 6999) return 'Sønderjylland & Sydvestjylland'
  if (n >= 7000 && n <= 7999) return 'Midt- & Vestjylland'
  if (n >= 8000 && n <= 8999) return 'Østjylland'
  if (n >= 9000 && n <= 9999) return 'Nordjylland'
  return 'Ukendt'
}

const REGION_ORDER = [
  'Hovedstaden',
  'Nordsjælland',
  'Bornholm',
  'Sjælland & Lolland-Falster',
  'Fyn',
  'Sønderjylland & Sydvestjylland',
  'Midt- & Vestjylland',
  'Østjylland',
  'Nordjylland',
  'Ukendt',
]

export function StrikkecafeerClient({ initialCafes }: Props) {
  const kortRef = useRef<DanmarksKortHandle | null>(null)
  const [activeRegion, setActiveRegion] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const map = new Map<string, StoreBase[]>()
    for (const c of initialCafes) {
      const r = regionForPostnr(c.postcode)
      if (!map.has(r)) map.set(r, [])
      map.get(r)!.push(c)
    }
    return map
  }, [initialCafes])

  const visibleCafes = useMemo(() => {
    let list = initialCafes
    if (activeRegion) list = list.filter(c => regionForPostnr(c.postcode) === activeRegion)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.postcode ?? '').includes(q),
      )
    }
    return list
  }, [initialCafes, activeRegion, search])

  function focusOnCafe(cafe: StoreBase) {
    kortRef.current?.flyTo(cafe.lat, cafe.lng, 13)
  }

  return (
    <div
      // onCopy/onContextMenu på hele siden er friction — dem der virkelig vil
      // kopiere kan stadig (DevTools), men casual scraping bremses.
      onCopy={e => {
        // Tillad copy af tekst når brugeren har valgt manuelt — men ikke
        // helsides-Cmd+A-derefter-kopi af rå data.
        const sel = window.getSelection()?.toString() ?? ''
        if (sel.length > 200) {
          e.preventDefault()
        }
      }}
      onContextMenu={e => {
        // Tillad i input-felter (søg)
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
      }}
      style={{ fontFamily: "'DM Sans', sans-serif", minHeight: 'calc(100vh - 58px - 57px)' }}
    >
      {/* Hero */}
      <section
        style={{
          background:
            'linear-gradient(135deg, rgba(255,252,247,0.82) 0%, rgba(244,239,230,0.82) 55%, rgba(234,217,222,0.82) 100%)',
          padding: '36px 0 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            gap: 28,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 420px', minWidth: 260 }}>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(28px, 4.2vw, 38px)',
                fontWeight: 600,
                color: '#302218',
                margin: 0,
                letterSpacing: '.01em',
              }}
            >
              Strikkecaféer
            </h1>
            <p
              style={{
                fontSize: 14.5,
                color: '#6B5D4F',
                margin: '6px 0 0',
                maxWidth: 640,
                lineHeight: 1.55,
              }}
            >
              Butikker med en hyggekrog hvor du kan sætte dig med dit projekt og en kop kaffe — alene
              eller sammen med andre. Klik på et kort for at zoome ind på butikken og se hvad der venter.
            </p>
            <p
              style={{
                fontSize: 12.5,
                color: '#8B7E6E',
                margin: '10px 0 0',
                maxWidth: 640,
                lineHeight: 1.55,
                fontStyle: 'italic',
              }}
            >
              Tilbuddene varierer — nogle har faste café-dage, andre står parat hver dag. Ring eller
              tjek butikkens side før du kommer langvejs fra.
            </p>
          </div>
          <div className="cafe-hero-art" style={{ flexShrink: 0, width: 220, maxWidth: '100%' }}>
            <HeroIllustration variant="cafe-kop-strik" />
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .cafe-hero-art { display: none !important; }
          }
        `}</style>
      </section>

      {/* Filter & søgning */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 24px 0' }}>
        <div
          style={{
            background: 'rgba(255,252,247,0.9)',
            border: '1px solid #E5DDD9',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søg butik, by eller postnummer"
              aria-label="Søg butik, by eller postnummer"
              style={{
                flex: '1 1 240px',
                minHeight: 44,
                padding: '10px 14px',
                border: '1px solid #D0C8BA',
                borderRadius: 8,
                fontSize: 14,
                background: '#F9F6F0',
                color: '#302218',
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: '#6B5D4F',
                background: '#F4EFE6',
                padding: '6px 12px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
              aria-live="polite"
            >
              {visibleCafes.length} caf{visibleCafes.length === 1 ? 'é' : 'éer'}
            </span>
          </div>

          <div>
            <div
              id="region-filter-label"
              style={{
                fontSize: 11,
                color: '#6B5D4F',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                marginBottom: 8,
              }}
            >
              Filtrér på region
            </div>
            <div role="group" aria-labelledby="region-filter-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <RegionChip label="Hele landet" count={initialCafes.length} active={activeRegion === null} onClick={() => setActiveRegion(null)} />
              {REGION_ORDER.filter(r => grouped.has(r)).map(r => (
                <RegionChip
                  key={r}
                  label={r}
                  count={(grouped.get(r) ?? []).length}
                  active={activeRegion === r}
                  onClick={() => setActiveRegion(r === activeRegion ? null : r)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Kort */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 24px 10px' }}>
        {initialCafes.length === 0 ? (
          <EmptyState />
        ) : (
          <DanmarksKort ref={kortRef} stores={visibleCafes} userLocation={null} />
        )}
      </div>

      {/* Liste */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 24px 60px' }}>
        {visibleCafes.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              background: 'rgba(255,252,247,0.9)',
              border: '1px solid #E5DDD9',
              borderRadius: 12,
              color: '#6B5D4F',
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            Ingen caféer matcher dine kriterier. Prøv at vælge en anden region eller ryd søgningen.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {REGION_ORDER.map(region => {
              const inRegion = visibleCafes.filter(c => regionForPostnr(c.postcode) === region)
              if (inRegion.length === 0) return null
              return (
                <section key={region} aria-labelledby={`region-${region}`}>
                  <h2
                    id={`region-${region}`}
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 20,
                      fontWeight: 600,
                      color: '#302218',
                      margin: '4px 0 10px',
                      letterSpacing: '.01em',
                    }}
                  >
                    {region}{' '}
                    <span style={{ fontSize: 13, color: '#8B7E6E', fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                      ({inRegion.length})
                    </span>
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {inRegion.map(cafe => (
                      <CafeCard key={cafe.id} cafe={cafe} onClick={() => focusOnCafe(cafe)} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function RegionChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        border: '1px solid',
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        background: active ? '#61846D' : '#FFFCF7',
        color: active ? '#FFFCF7' : '#302218',
        borderColor: active ? '#61846D' : '#D0C8BA',
        fontWeight: active ? 500 : 400,
        minHeight: 44,
        whiteSpace: 'nowrap',
      }}
    >
      {label}{' '}
      <span style={{ opacity: 0.65, fontWeight: 400, marginLeft: 4 }}>({count})</span>
    </button>
  )
}

function CafeCard({ cafe, onClick }: { cafe: StoreBase; onClick: () => void }) {
  const websiteHref = cafe.website
    ? cafe.website.startsWith('http')
      ? cafe.website
      : `https://${cafe.website}`
    : null
  const address = [cafe.address, cafe.postcode, cafe.city].filter(Boolean).join(', ')

  // Krydsreference til kalender: find events der nævner caféens navn eller by.
  // Match-heuristik tåler false positives (vises kun som "Næste arrangementer her" — ikke bindende).
  const matches = [
    ...eventsAtLokation(cafe.name, 2),
    ...eventsAtLokation(cafe.city, 2),
  ]
  // Dedupliker hvis samme event matchede begge.
  const seen = new Set<string>()
  const events = matches.filter(ev => {
    const key = `${ev.titel}|${ev.dato}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 2)
  return (
    <article
      style={{
        background: '#FFFCF7',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 1px 4px rgba(48,34,24,.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 17,
            fontWeight: 600,
            color: '#302218',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {cafe.name}
        </h3>
        <span
          aria-label="Strikkecafé"
          title="Strikkecafé"
          style={{
            fontSize: 11,
            background: '#EAF3DE',
            color: '#173404',
            borderRadius: 999,
            padding: '3px 9px',
            whiteSpace: 'nowrap',
            fontWeight: 500,
          }}
        >
          ☕ Café
        </span>
      </div>

      {address && (
        <div
          style={{ fontSize: 13, color: '#6B5D4F', lineHeight: 1.45 }}
          // CSS-trick: brug user-select:text men render som flow-text så
          // simple JSON-scrapes har sværere ved at få strukturerede records.
        >
          {address}
        </div>
      )}

      {cafe.note && (
        <div
          style={{
            fontSize: 12.5,
            color: '#3F362B',
            background: '#F9F6F0',
            padding: '8px 10px',
            borderRadius: 8,
            borderLeft: '3px solid #61846D',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {cafe.note}
        </div>
      )}

      {events.length > 0 && (
        <div style={{
          marginTop: 2,
          padding: '8px 10px',
          background: '#F4EDE2',
          borderRadius: 8,
          borderLeft: '3px solid #9B6272',
        }}>
          <div style={{
            fontSize: 10.5, color: '#9B6272',
            textTransform: 'uppercase', letterSpacing: '.06em',
            fontWeight: 600, marginBottom: 4,
          }}>
            Næste arrangementer her
          </div>
          {events.map((ev, i) => (
            <a
              key={`${ev.titel}-${i}`}
              href={ev.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                fontSize: 12.5,
                color: '#302218',
                textDecoration: 'none',
                padding: '2px 0',
              }}
            >
              <strong style={{ color: ev.farve }}>{ev.dato}</strong>{' · '}{ev.titel}
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5 }}>
        {cafe.phone && (
          <a
            href={`tel:${cafe.phone.replace(/\s/g, '')}`}
            style={{ color: '#302218', textDecoration: 'none' }}
          >
            📞 {cafe.phone}
          </a>
        )}
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: '#61846D', textDecoration: 'none', fontWeight: 500 }}
          >
            Åbn website →
          </a>
        )}
        <button
          type="button"
          onClick={onClick}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: '1px solid #D0C8BA',
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 12,
            color: '#302218',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Vis på kortet
        </button>
      </div>
    </article>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: 'rgba(255,252,247,0.9)',
        border: '1px solid #E5DDD9',
        borderRadius: 12,
        color: '#6B5D4F',
        fontSize: 13.5,
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>☕</div>
      Vi indsamler stadig butikker med strikkecafé. Kig forbi senere — eller{' '}
      <a href="/find-forhandler" style={{ color: '#61846D', fontWeight: 500 }}>
        find andre garnbutikker nær dig
      </a>
      .
    </div>
  )
}

function KortSkeleton() {
  return (
    <div
      style={{
        height: 460,
        width: '100%',
        borderRadius: 12,
        background: 'linear-gradient(135deg, #F4EFE6 0%, #E9F0EB 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B5D4F',
        fontSize: 13,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      Indlæser kort…
    </div>
  )
}
