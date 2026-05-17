'use client'

import type { OnlineRetailer } from '@/lib/data/retailers'
import { HIDDEN_BRAND_SLUGS } from '@/lib/data/retailers'
import { safeWebUrl } from '@/lib/url/safeWebUrl'
import { heroForSlug } from '@/lib/online-hero'

type Props = {
  retailer: OnlineRetailer
  activeBrandSlug: string | null
}

// Kort med farvet venstre-kant (matcher FeatureCard-mønstret på forsiden).
// Farven er procedural ud fra retailer.slug (FNV-hash → STRIQ-palette) så
// hver shop får sin egen visuelle "accent" uden DB-felt.
// id="retailer-<slug>" så cross-links fra fysisk-siden kan scrolle hertil.
export function RetailerCard({ retailer, activeBrandSlug }: Props) {
  const parsedUrl = safeWebUrl(retailer.url)
  const hostname = parsedUrl ? parsedUrl.hostname.replace(/^www\./, '') : ''
  const safeHref = parsedUrl ? parsedUrl.toString() : null
  const accent = heroForSlug(retailer.slug).bg
  const visibleBrands = retailer.brands.filter(b => !HIDDEN_BRAND_SLUGS.has(b.slug))
  const hasPhysical = retailer.physical_store_count > 0
  // Cross-link bevarer aktivt brand-filter hvis sat.
  const physicalHref = `/find-forhandler?retailer=${encodeURIComponent(retailer.slug)}${activeBrandSlug ? `&brand=${encodeURIComponent(activeBrandSlug)}` : ''}`

  return (
    <article
      id={`retailer-${retailer.slug}`}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5DDD9',
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: '20px 22px 22px',
        boxShadow: '0 1px 4px rgba(48,34,24,.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 20,
            fontWeight: 600,
            color: '#302218',
            margin: 0,
            letterSpacing: '.005em',
            lineHeight: 1.2,
          }}
        >
          {retailer.navn}
        </h3>
        <span style={{ fontSize: 12.5, color: '#9C8B7D' }}>{hostname}</span>
      </div>

      {retailer.beskrivelse && (
        <p style={{ fontSize: 13, color: '#6B5D4F', margin: 0, lineHeight: 1.55 }}>
          {retailer.beskrivelse}
        </p>
      )}

      {visibleBrands.length > 0 && (
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
      )}

      {hasPhysical && (
        <a
          href={physicalHref}
          aria-label={`${retailer.navn} har også fysisk butik — gå til find-forhandler`}
          style={{
            alignSelf: 'flex-start',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            color: '#3E5B47',
            background: '#E0EBE3',
            border: '1px solid #A8C4B1',
            borderRadius: 999,
            padding: '10px 14px',
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          <span aria-hidden="true">📍</span>
          Også fysisk butik
          <span aria-hidden="true" style={{ fontSize: 12 }}>→</span>
        </a>
      )}

      <div style={{ flex: 1 }} />

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
            marginTop: 4,
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
