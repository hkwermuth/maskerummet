'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSupabase } from '@/lib/supabase/client'
import { HeroIllustration } from '@/components/layout/HeroIllustration'
import { searchStoresNear, type StoreBase, type StoreResult } from '@/lib/data/stores'
import type { Brand, OnlineRetailer } from '@/lib/data/retailers'
import type { DanmarksKortHandle } from './DanmarksKortClient'
import { FilterChip, HIDDEN_BRAND_SLUGS, OnlineRetailersSection, orderBrands } from './OnlineRetailersSection'

const DanmarksKort = dynamic(() => import('./DanmarksKortClient'), {
  ssr: false,
  loading: () => <KortSkeleton />,
})

const RADII = [10, 25, 50]

type SearchResults = {
  stores: StoreResult[]
  label: string
  lat: number
  lng: number
}

type GeoError = {
  code: number
  message: string
}

type Props = {
  initialStores: StoreBase[]
  retailers?: OnlineRetailer[]
  brands?: Brand[]
}

export function FindForhandlerClient({
  initialStores,
  retailers = [],
  brands = [],
}: Props) {
  const supabase = useSupabase()
  const kortRef = useRef<DanmarksKortHandle | null>(null)
  const searchIdRef = useRef(0)

  const [city, setCity] = useState('')
  const [radius, setRadius] = useState(25)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [activeBrand, setActiveBrand] = useState<string | null>(null)

  // Kun mærker med mindst én fysisk butik vises i chip-listen (mærker uden
  // fysiske butikker kan stadig have online-forhandlere — de vises bare ikke
  // som filter-chip). Derudover filtreres HIDDEN_BRAND_SLUGS fra — en manuelt
  // kurateret liste over mærker der pt. er for få forhandlere af til at være
  // meningsfulde som filter.
  const brandsWithStores = useMemo(() => {
    const slugsInStores = new Set<string>()
    initialStores.forEach(s => s.brands.forEach(b => slugsInStores.add(b.slug)))
    return brands.filter(b => slugsInStores.has(b.slug) && !HIDDEN_BRAND_SLUGS.has(b.slug))
  }, [brands, initialStores])

  const orderedBrands = useMemo(() => orderBrands(brandsWithStores), [brandsWithStores])

  const filteredStores = useMemo(() => {
    if (!activeBrand) return initialStores
    return initialStores.filter(s => s.brands.some(b => b.slug === activeBrand))
  }, [initialStores, activeBrand])

  const activeBrandName = activeBrand
    ? brands.find(b => b.slug === activeBrand)?.name ?? null
    : null

  async function geocodeCity(name: string) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&countrycodes=dk&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'da' } })
    const data = await res.json()
    if (!data.length) throw new Error(`Kunne ikke finde "${name}" i Danmark`)
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }

  async function geolocateByIP(): Promise<{ lat: number; lng: number; city: string }> {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) throw new Error(`IP-lokation fejlede (HTTP ${res.status})`)
    const data = await res.json()
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('IP-lokation returnerede ingen koordinater')
    }
    return {
      lat: data.latitude,
      lng: data.longitude,
      city: typeof data.city === 'string' && data.city ? data.city : 'din placering',
    }
  }

  async function tryIpFallback() {
    try {
      const { lat, lng, city: ipCity } = await geolocateByIP()
      const label = `Omkring ${ipCity} (via IP)`
      setCity(label)
      setGeoLoading(false)
      await runSearch(lat, lng, label)
    } catch {
      setGeoLoading(false)
      setError('Kunne ikke finde din placering — hverken via GPS eller IP. Prøv at skrive en by i stedet.')
    }
  }

  async function useMyLocation() {
    setError(null)

    if (!('geolocation' in navigator)) {
      setGeoLoading(true)
      await tryIpFallback()
      return
    }

    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:'
      const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      if (!isHttps && !isLocal) {
        setError('Din placering kræver en sikker forbindelse (HTTPS). Skriv en by i stedet.')
        return
      }
    }

    if ('permissions' in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        if (perm.state === 'denied') {
          setError('Din browser har tidligere blokeret adgang til din placering. Åbn siteindstillinger og tillad placering for at bruge denne funktion.')
          return
        }
      } catch {
        // Permissions API er ikke tilgængelig — fortsæt alligevel
      }
    }

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        setCity('Min placering')
        setGeoLoading(false)
        await runSearch(pos.coords.latitude, pos.coords.longitude, 'Min placering')
      },
      async (e: GeoError) => {
        if (e.code === 2 || e.code === 3) {
          await tryIpFallback()
          return
        }
        setGeoLoading(false)
        if (e.code === 1) setError('Du har afvist adgang til din placering. Tryk på låsikonet i adresselinjen for at tillade det.')
        else setError('Kunne ikke hente din placering. Prøv at skrive en by i stedet.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!city.trim()) { setError('Skriv en by eller postnummer'); return }
    setError(null)
    setLoading(true)
    try {
      const { lat, lng } = await geocodeCity(city)
      await runSearch(lat, lng, city)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ukendt fejl'
      setError(msg)
    }
    setLoading(false)
  }

  async function runSearch(lat: number, lng: number, label: string, brandOverride?: string | null) {
    // brandOverride sendes af useEffect når brand skiftes, så vi ikke venter på at React
    // genrender runSearch med ny closure — vigtigt når effekten fyres umiddelbart efter state-skift.
    const brand = brandOverride !== undefined ? brandOverride : activeBrand
    const id = ++searchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const stores = await searchStoresNear(supabase, { lat, lng, radius, brandSlug: brand })
      if (id !== searchIdRef.current) return
      setResults({ stores, label, lat, lng })
      kortRef.current?.flyTo(lat, lng, 11)
    } catch (err) {
      if (id !== searchIdRef.current) return
      const msg = err instanceof Error ? err.message : 'Ukendt fejl'
      setError('Søgning fejlede: ' + msg)
    } finally {
      if (id === searchIdRef.current) setLoading(false)
    }
  }

  // Re-kør søgning når brand skiftes efter en aktiv søgning, så resultaterne
  // matcher nyt brand (ikke bare klient-filter af gammelt datasæt).
  useEffect(() => {
    if (!results) return
    void runSearch(results.lat, results.lng, results.label, activeBrand)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand])

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
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(28px, 4.2vw, 38px)',
              fontWeight: 600, color: '#302218', margin: 0, letterSpacing: '.01em',
            }}>
              Find garnbutikker nær dig
            </h1>
            <p style={{ fontSize: 14.5, color: '#6B5D4F', margin: '6px 0 0', maxWidth: 640, lineHeight: 1.55 }}>
              Søg på by, brug din placering eller udforsk kortet — vi har 200+ danske garnbutikker med.
            </p>
          </div>
          <div className="forhandler-hero-art" style={{ flexShrink: 0, width: 220, maxWidth: '100%' }}>
            <HeroIllustration variant="forhandler-butik-facade" />
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .forhandler-hero-art { display: none !important; }
          }
        `}</style>
      </section>

      {/* Søgefelt */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 24px 4px' }}>
        <form
          onSubmit={handleSearch}
          style={{
            background: 'rgba(255,252,247,0.9)',
            border: '1px solid #E5DDD9',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="By eller postnummer — fx Hillerød eller 3400"
              aria-label="By eller postnummer"
              style={{
                flex: '1 1 220px', minHeight: 44,
                padding: '10px 14px', border: '1px solid #D0C8BA', borderRadius: 8,
                fontSize: 14, background: '#F9F6F0', color: '#302218',
                fontFamily: "'DM Sans', sans-serif", outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={useMyLocation}
              disabled={geoLoading}
              aria-label="Brug min placering"
              style={{
                minHeight: 44,
                padding: '10px 16px',
                background: geoLoading ? '#EDE7D8' : '#F4EFE6',
                border: '1px solid #D0C8BA', borderRadius: 8,
                color: '#302218', fontSize: 13, cursor: geoLoading ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
              }}
            >
              {geoLoading ? 'Finder dig…' : '📍 Min placering'}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                minHeight: 44,
                padding: '10px 24px',
                background: loading ? '#A0B4A8' : '#61846D',
                color: '#FFFCF7', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Søger…' : 'Søg'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#8C7E74', textTransform: 'uppercase', letterSpacing: '.1em' }}>Radius:</span>
            {RADII.map(r => {
              const active = radius === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
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
                  }}
                >
                  {r} km
                </button>
              )
            })}
          </div>

          {error && (
            <div role="alert" style={{ padding: '10px 14px', background: '#F5E8E0', borderRadius: 8, fontSize: 12.5, color: '#8B3A2A' }}>
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Mærke-filter over kortet — styrer både kort, resultater og online-sektion */}
      {orderedBrands.length > 0 && (
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px 0' }}>
          <div
            style={{
              fontSize: 11,
              color: '#8C7E74',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              marginBottom: 8,
            }}
            id="brand-filter-label"
          >
            Filtrér på mærke
          </div>
          <div
            role="group"
            aria-labelledby="brand-filter-label"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            <FilterChip
              label="Alle"
              active={activeBrand === null}
              onClick={() => setActiveBrand(null)}
            />
            {orderedBrands.map(brand => (
              <FilterChip
                key={brand.slug}
                label={brand.name}
                active={activeBrand === brand.slug}
                onClick={() => setActiveBrand(brand.slug)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Kort */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 24px 10px' }}>
        {initialStores.length === 0 ? (
          <div style={{
            padding: '24px 20px', textAlign: 'center',
            background: 'rgba(255,252,247,0.9)', border: '1px solid #E5DDD9', borderRadius: 12,
            color: '#6B5D4F', fontSize: 13.5, lineHeight: 1.55,
          }}>
            Kortet er under opbygning — vi mangler stadig koordinater på butikkerne. Prøv søgefunktionen ovenfor.
          </div>
        ) : filteredStores.length === 0 ? (
          <div style={{
            padding: '24px 20px', textAlign: 'center',
            background: 'rgba(255,252,247,0.9)', border: '1px solid #E5DDD9', borderRadius: 12,
            color: '#6B5D4F', fontSize: 13.5, lineHeight: 1.55,
          }}>
            Vi har ikke registreret hvilke fysiske butikker der fører <strong>{activeBrandName}</strong> endnu.
            <br />
            <a
              href="#online-forhandlere"
              style={{ color: '#61846D', fontWeight: 500, textDecoration: 'underline' }}
            >
              Se webshops der fører {activeBrandName} ↓
            </a>
            {' '}eller{' '}
            <button
              type="button"
              onClick={() => setActiveBrand(null)}
              style={{
                background: 'transparent', border: 'none', padding: 0,
                color: '#61846D', fontSize: 13.5, cursor: 'pointer',
                textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              vis alle butikker på kortet
            </button>.
          </div>
        ) : (
          <DanmarksKort ref={kortRef} stores={filteredStores} />
        )}
      </div>

      {/* Resultater */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 24px 60px' }}>
        {results === null && !loading && (
          <div style={{ textAlign: 'center', padding: '24px 20px', color: '#8C7E74', fontSize: 13.5, lineHeight: 1.55 }}>
            Klik på en pin på kortet, eller søg efter en by for at se butikker i nærheden.
          </div>
        )}

        {results !== null && (
          <>
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#302218' }}>
                {results.stores.length === 0 ? 'Ingen resultater' : `${results.stores.length} butik${results.stores.length !== 1 ? 'ker' : ''}`}
              </span>
              <span style={{ fontSize: 12.5, color: '#8C7E74' }}>
                inden for {radius} km fra {results.label}
                {activeBrandName ? ` der fører ${activeBrandName}` : ''}
              </span>
            </div>

            {results.stores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#8C7E74' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 13 }}>
                  {activeBrandName
                    ? `Prøv en større radius eller et andet mærke`
                    : 'Prøv en større radius'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.stores.map(store => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <OnlineRetailersSection retailers={retailers} brands={brands} activeBrand={activeBrand} />
    </div>
  )
}

function StoreCard({ store }: { store: StoreResult }) {
  const websiteHref = store.website
    ? store.website.startsWith('http')
      ? store.website
      : `https://${store.website}`
    : null
  const address = [store.address, store.postcode, store.city].filter(Boolean).join(', ')
  return (
    <div style={{
      background: '#FFFCF7', borderRadius: 10, padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(48,34,24,.07)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, color: '#302218' }}>{store.name}</span>
          <span style={{ fontSize: 11, background: '#E5DDD9', color: '#302218', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
            {store.distance_km} km
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: '#8C7E74' }}>{address}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
        {store.phone && (
          <a href={`tel:${store.phone}`} style={{ fontSize: 12.5, color: '#302218', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            📞 {store.phone}
          </a>
        )}
        {websiteHref && (
          <a href={websiteHref} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#61846D', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Åbn website →
          </a>
        )}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.name, store.address, store.city].filter(Boolean).join(', '))}`}
          target="_blank" rel="noreferrer"
          style={{ fontSize: 11.5, color: '#8C7E74', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Vis på kort ↗
        </a>
      </div>
    </div>
  )
}

function KortSkeleton() {
  return (
    <div style={{
      height: 460, width: '100%', borderRadius: 12,
      background: 'linear-gradient(135deg, #F4EFE6 0%, #E9F0EB 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#8C7E74', fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    }}>
      Indlæser kort…
    </div>
  )
}
