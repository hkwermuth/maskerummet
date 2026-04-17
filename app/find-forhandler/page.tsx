'use client'

import { useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import type { Metadata } from 'next'

const BRANDS = [
  { slug: 'permin',    name: 'Permin' },
  { slug: 'filcolana', name: 'Filcolana' },
  { slug: 'drops',     name: 'DROPS' },
  { slug: 'sandnes',   name: 'Sandnes' },
  { slug: 'isager',    name: 'Isager' },
  { slug: 'camarose',  name: 'CaMaRose' },
  { slug: 'holst',     name: 'Holst Garn' },
  { slug: 'kfo',       name: 'Knitting for Olive' },
]

const RADII = [10, 25, 50]

type StoreResult = {
  id: string
  name: string
  address?: string
  postcode?: string
  city?: string
  phone?: string
  website?: string
  brands?: string[]
  distance_km: number
}

type SearchResults = {
  stores: StoreResult[]
  label: string
  lat: number
  lng: number
}

export default function FindForhandlerPage() {
  const supabase = useSupabase()
  const [city, setCity] = useState('')
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [radius, setRadius] = useState(25)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  function toggleBrand(slug: string) {
    setSelectedBrands(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  async function geocodeCity(name: string) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&countrycodes=dk&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'da' } })
    const data = await res.json()
    if (!data.length) throw new Error(`Kunne ikke finde "${name}" i Danmark`)
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }

  function useMyLocation() {
    setGeoLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCity('Min placering')
        setGeoLoading(false)
        runSearch(pos.coords.latitude, pos.coords.longitude, 'Min placering')
      },
      () => {
        setGeoLoading(false)
        setError('Kunne ikke hente din placering. Prøv at skrive en by i stedet.')
      }
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
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function runSearch(lat: number, lng: number, label: string) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('find_stores_near', {
        search_lat: lat, search_lng: lng,
        radius_km: radius,
        brand_slugs: selectedBrands.length > 0 ? selectedBrands : null,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      setResults({ stores: (data ?? []) as StoreResult[], label, lat, lng })
    } catch (e: any) {
      setError('Søgning fejlede: ' + e.message)
    }
    setLoading(false)
  }

  const brandLabel = (slug: string) => BRANDS.find(b => b.slug === slug)?.name ?? slug

  const pillBase: React.CSSProperties = {
    padding: '5px 14px', borderRadius: 20, fontSize: 12,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    border: '1px solid', transition: 'all .15s',
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: 'transparent', minHeight: '100vh' }}>
      {/* Search panel */}
      <div style={{ background: '#61846D', padding: '20px 24px 24px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 4, letterSpacing: '.06em' }}>
          Forhandlersøgning
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#EDF5F0', marginBottom: 18 }}>
          Find garn nær dig
        </div>

        {/* City input */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={city} onChange={e => setCity(e.target.value)}
            placeholder="By eller postnummer — fx Hillerød eller 3400"
            style={{ flex: '1 1 220px', padding: '10px 14px', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,.12)', color: '#fff', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
          />
          <button type="button" onClick={useMyLocation} disabled={geoLoading}
            style={{ padding: '10px 14px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, color: '#C9E6DA', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            {geoLoading ? '...' : '📍 Min placering'}
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: '10px 22px', background: '#9B6272', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            {loading ? 'Søger...' : 'Søg'}
          </button>
        </form>

        {/* Brand pills */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
            Mærker — vælg én eller flere (tom = alle)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BRANDS.map(b => {
              const active = selectedBrands.includes(b.slug)
              return (
                <button key={b.slug} onClick={() => toggleBrand(b.slug)} style={{
                  ...pillBase,
                  background: active ? '#EDF5F0' : 'rgba(255,255,255,.08)',
                  color: active ? '#302218' : '#C9E6DA',
                  borderColor: active ? '#EDF5F0' : 'rgba(255,255,255,.2)',
                  fontWeight: active ? 600 : 400,
                }}>{b.name}</button>
              )
            })}
          </div>
        </div>

        {/* Radius */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Radius:</span>
          {RADII.map(r => (
            <button key={r} onClick={() => setRadius(r)} style={{
              ...pillBase, padding: '3px 12px',
              background: radius === r ? '#EDF5F0' : 'rgba(255,255,255,.08)',
              color: radius === r ? '#302218' : '#C9E6DA',
              borderColor: radius === r ? '#EDF5F0' : 'rgba(255,255,255,.2)',
              fontWeight: radius === r ? 600 : 400,
            }}>{r} km</button>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(155,98,114,.25)', borderRadius: 8, fontSize: 12, color: '#F5C4A8' }}>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{ padding: 20 }}>
        {results === null && !loading && (
          <div style={{ textAlign: 'center', paddingTop: 48, color: '#8C7E74' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧶</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#302218' }}>
              Søg efter garnbutikker nær dig
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Vælg et eller flere mærker og indtast din by</div>
          </div>
        )}

        {results !== null && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#302218' }}>
                {results.stores.length === 0 ? 'Ingen resultater' : `${results.stores.length} butik${results.stores.length !== 1 ? 'ker' : ''}`}
              </span>
              <span style={{ fontSize: 12, color: '#8C7E74' }}>
                inden for {radius} km fra {results.label}
                {selectedBrands.length > 0 && ` · ${selectedBrands.map(brandLabel).join(', ')}`}
              </span>
            </div>

            {results.stores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8C7E74' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 13 }}>Prøv en større radius eller færre mærker</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.stores.map(store => (
                  <div key={store.id} style={{
                    background: '#FFFCF7', borderRadius: 10, padding: '14px 16px',
                    boxShadow: '0 1px 4px rgba(48,34,24,.07)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, color: '#302218' }}>{store.name}</span>
                        <span style={{ fontSize: 11, background: '#E5DDD9', color: '#302218', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          {store.distance_km} km
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8C7E74', marginBottom: 6 }}>
                        {[store.address, store.postcode, store.city].filter(Boolean).join(', ')}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {(store.brands ?? []).map(slug => (
                          <span key={slug} style={{ fontSize: 11, background: '#C9E6DA', color: '#302218', borderRadius: 20, padding: '2px 8px' }}>
                            {brandLabel(slug)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      {store.phone && (
                        <a href={`tel:${store.phone}`} style={{ fontSize: 12, color: '#302218', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          📞 {store.phone}
                        </a>
                      )}
                      {store.website && (
                        <a href={store.website.startsWith('http') ? store.website : `https://${store.website}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: '#61846D', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Åbn website →
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.name, store.address, store.city].filter(Boolean).join(', '))}`}
                        target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: '#8C7E74', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Vis på kort ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
