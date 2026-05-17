'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Brand, OnlineRetailer } from '@/lib/data/retailers'
import { BrandFilter } from '@/components/catalog/BrandFilter'
import { HeroIllustration } from '@/components/layout/HeroIllustration'
import { RetailerCard } from './RetailerCard'

type Props = {
  retailers: OnlineRetailer[]
  brands: Brand[]
  initialBrand: string | null
}

export function OnlineForhandlereClient({ retailers, brands, initialBrand }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeBrand, setActiveBrand] = useState<string | null>(initialBrand)

  // Hold lokal state synkroniseret hvis URL ændres af navigation/back.
  useEffect(() => {
    const fromUrl = searchParams.get('brand')
    setActiveBrand(fromUrl)
  }, [searchParams])

  const handleBrandChange = (slug: string | null) => {
    setActiveBrand(slug)
    const params = new URLSearchParams(searchParams.toString())
    if (slug) params.set('brand', slug)
    else params.delete('brand')
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }

  const filtered = useMemo(() => {
    if (!activeBrand) return retailers
    return retailers.filter(r => r.brands.some(b => b.slug === activeBrand))
  }, [retailers, activeBrand])

  // Vis kun brands der har mindst én retailer (efter filtrering).
  const brandsWithRetailers = useMemo(() => {
    const slugs = new Set<string>()
    for (const r of retailers) for (const b of r.brands) slugs.add(b.slug)
    return brands.filter(b => slugs.has(b.slug))
  }, [brands, retailers])

  const activeBrandName = activeBrand
    ? brands.find(b => b.slug === activeBrand)?.name ?? null
    : null

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: 'calc(100vh - 58px - 57px)' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(255,252,247,0.82) 0%, rgba(244,239,230,0.82) 55%, rgba(234,217,222,0.82) 100%)',
        padding: '36px 0 32px',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          display: 'flex', gap: 28,
          alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 420px', minWidth: 260 }}>
            <h1
              id="online-heading"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(28px, 4.2vw, 38px)',
                fontWeight: 600, color: '#302218', margin: 0, letterSpacing: '.01em',
              }}
            >
              Køb garn online
            </h1>
            <p style={{ fontSize: 14.5, color: '#6B5D4F', margin: '6px 0 0', maxWidth: 640, lineHeight: 1.55 }}>
              {retailers.length} webshops leverer til Danmark. Filtrér på mærke for at finde
              forhandlere af netop det garn du leder efter — eller find en{' '}
              <a href="/find-forhandler" style={{ color: '#61846D', fontWeight: 500 }}>
                fysisk butik nær dig
              </a>
              .
            </p>
          </div>
          <div className="online-hero-art" style={{ flexShrink: 0, width: 220, maxWidth: '100%' }}>
            <HeroIllustration variant="online-pakke-laptop" />
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .online-hero-art { display: none !important; }
          }
        `}</style>
      </section>

      <section
        aria-labelledby="online-heading"
        style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 24px 60px' }}
      >
        <p style={{ fontSize: 14, color: '#6B5D4F', margin: '0 0 18px', maxWidth: 640, lineHeight: 1.55 }}>
          {activeBrandName
            ? `${filtered.length} af ${retailers.length} webshops fører ${activeBrandName}.`
            : 'Alle leverer til Danmark.'}
        </p>

        <div style={{ marginBottom: 18 }}>
          <span id="brand-filter-label" style={{ position: 'absolute', left: -9999 }}>
            Filtrér efter mærke
          </span>
          <BrandFilter
            brands={brandsWithRetailers}
            activeBrand={activeBrand}
            onChange={handleBrandChange}
            labelledById="brand-filter-label"
          />
        </div>

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
            Ingen online-forhandlere registreret for <strong>{activeBrandName ?? 'dette mærke'}</strong> endnu.
            <br />
            Mangler der en? <a href="mailto:kontakt@striq.dk" style={{ color: '#61846D' }}>Skriv til os</a>.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {filtered.map(retailer => (
              <RetailerCard
                key={retailer.id}
                retailer={retailer}
                activeBrandSlug={activeBrand}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
