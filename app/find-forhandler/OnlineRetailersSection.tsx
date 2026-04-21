'use client'

import { useMemo } from 'react'
import type { Brand, OnlineRetailer } from '@/lib/data/retailers'

type Props = {
  retailers: OnlineRetailer[]
  brands: Brand[]
  activeBrand: string | null
}

export const FEATURED_BRAND_SLUGS = ['drops', 'permin', 'filcolana'] as const

// Mærker der midlertidigt skjules overalt på siden (for få forhandlere, lille
// dansk tilstedeværelse). Data bliver i databasen — kan reaktiveres ved at
// fjerne slug herfra.
export const HIDDEN_BRAND_SLUGS = new Set(['hillesvag', 'holst', 'hobbii', 'novita'])

// Sortér brands så Drops, Permin, Filcolana ligger først; derefter alfabetisk.
export function orderBrands(brands: Brand[]): Brand[] {
  const featured = FEATURED_BRAND_SLUGS
    .map(slug => brands.find(b => b.slug === slug))
    .filter((b): b is Brand => Boolean(b))
  const rest = brands
    .filter(b => !FEATURED_BRAND_SLUGS.includes(b.slug as (typeof FEATURED_BRAND_SLUGS)[number]))
    .sort((a, b) => a.name.localeCompare(b.name, 'da'))
  return [...featured, ...rest]
}

export function OnlineRetailersSection({ retailers, brands, activeBrand }: Props) {
  const filtered = useMemo(() => {
    if (!activeBrand) return retailers
    return retailers.filter(r => r.brands.some(b => b.slug === activeBrand))
  }, [retailers, activeBrand])

  const activeBrandName = activeBrand
    ? brands.find(b => b.slug === activeBrand)?.name ?? null
    : null

  return (
    <section
      id="online-forhandlere"
      aria-labelledby="online-forhandlere-heading"
      style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 24px 60px' }}
    >
      <div
        style={{
          borderTop: '1px solid #E5DDD9',
          paddingTop: 28,
          marginTop: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <h2
            id="online-forhandlere-heading"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 600,
              color: '#302218',
              margin: 0,
              letterSpacing: '.01em',
            }}
          >
            Køb garn online
          </h2>
          <span style={{ fontSize: 15, color: '#302218', fontWeight: 500 }}>
            {activeBrandName
              ? `${filtered.length} af ${retailers.length} webshops fører ${activeBrandName}`
              : `${retailers.length} webshops leverer til Danmark`}
          </span>
        </div>
        <p style={{ fontSize: 14, color: '#6B5D4F', margin: '0 0 18px', lineHeight: 1.55, maxWidth: 640 }}>
          Brug mærke-filteret øverst på siden for at finde forhandlere der fører
          netop det garn du leder efter. Alle webshops her leverer til Danmark.
        </p>

        {filtered.length === 0 ? (
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
            Ingen online-forhandlere registreret for <strong>{activeBrandName}</strong> endnu.
            <br />
            Mangler der en? <a href="mailto:kontakt@striq.dk" style={{ color: '#61846D' }}>Skriv til os</a>.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map(retailer => (
              <RetailerCard key={retailer.id} retailer={retailer} activeBrandSlug={activeBrand} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        minHeight: 44,
        padding: '8px 16px',
        borderRadius: 999,
        border: '1px solid',
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        background: active ? '#61846D' : '#FFFCF7',
        color: active ? '#FFFCF7' : '#302218',
        borderColor: active ? '#61846D' : '#D0C8BA',
        fontWeight: active ? 500 : 400,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// Kun http(s) tillades — beskytter mod javascript:/data:/vbscript:-URL'er hvis
// seed eller admin-UI ved uheld lader en ondsindet URL slippe igennem.
function safeWebUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed
    return null
  } catch {
    return null
  }
}

function RetailerCard({
  retailer,
  activeBrandSlug,
}: {
  retailer: OnlineRetailer
  activeBrandSlug: string | null
}) {
  const parsedUrl = safeWebUrl(retailer.url)
  const hostname = parsedUrl ? parsedUrl.hostname.replace(/^www\./, '') : ''
  const safeHref = parsedUrl ? parsedUrl.toString() : null

  return (
    <article
      style={{
        background: '#FFFCF7',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 1px 4px rgba(48,34,24,.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 170,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 18,
            fontWeight: 600,
            color: '#302218',
            margin: 0,
            letterSpacing: '.01em',
          }}
        >
          {retailer.navn}
        </h3>
        <span style={{ fontSize: 13, color: '#6B5D4F' }}>{hostname}</span>
        {retailer.beskrivelse && (
          <p style={{ fontSize: 13, color: '#6B5D4F', margin: '4px 0 0', lineHeight: 1.5 }}>
            {retailer.beskrivelse}
          </p>
        )}
      </div>

      {(() => {
        const visibleBrands = retailer.brands.filter(b => !HIDDEN_BRAND_SLUGS.has(b.slug))
        if (visibleBrands.length === 0) return null
        return (
        <div
          aria-label="Mærker"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}
        >
          {visibleBrands.slice(0, 6).map(brand => {
            const highlighted = activeBrandSlug === brand.slug
            return (
              <span
                key={brand.id}
                style={{
                  fontSize: 11,
                  background: highlighted ? '#E0EBE3' : '#F4EFE6',
                  color: highlighted ? '#3E5B47' : '#6B5D4F',
                  borderRadius: 999,
                  padding: '3px 9px',
                  border: highlighted ? '1px solid #A8C4B1' : '1px solid transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {brand.name}
              </span>
            )
          })}
          {visibleBrands.length > 6 && (
            <span style={{ fontSize: 11, color: '#6B5D4F', padding: '3px 4px' }}>
              +{visibleBrands.length - 6}
            </span>
          )}
        </div>
        )
      })()}

      {safeHref ? (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Besøg ${retailer.navn} (åbner i nyt vindue)`}
          style={{
            alignSelf: 'flex-start',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            background: '#F4EFE6',
            border: '1px solid #D0C8BA',
            borderRadius: 8,
            color: '#302218',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Besøg webshop
          <span aria-hidden="true" style={{ fontSize: 12 }}>↗</span>
        </a>
      ) : (
        <span style={{ fontSize: 12, color: '#6B5D4F', fontStyle: 'italic' }}>
          Webshop-link utilgængeligt
        </span>
      )}
    </article>
  )
}
