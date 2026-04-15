import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

const pillBase = {
  padding: '5px 14px', borderRadius: '20px', fontSize: '12px',
  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  border: '1px solid', transition: 'all .15s',
}

export default function FindGarn() {
  const [city, setCity] = useState('')
  const [selectedBrands, setSelectedBrands] = useState([])
  const [radius, setRadius] = useState(25)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)

  function toggleBrand(slug) {
    setSelectedBrands(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  async function geocodeCity(name) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&countrycodes=dk&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'da' } })
    const data = await res.json()
    if (!data.length) throw new Error(`Kunne ikke finde "${name}" i Danmark`)
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name.split(',')[0] }
  }

  async function useMyLocation() {
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

  async function handleSearch(e) {
    e?.preventDefault()
    if (!city.trim()) { setError('Skriv en by eller postnummer'); return }
    setError(null)
    setLoading(true)
    try {
      const { lat, lng } = await geocodeCity(city)
      await runSearch(lat, lng, city)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function runSearch(lat, lng, label) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('find_stores_near', {
        search_lat:  lat,
        search_lng:  lng,
        radius_km:   radius,
        brand_slugs: selectedBrands.length > 0 ? selectedBrands : null,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      setResults({ stores: data ?? [], label, lat, lng })
    } catch (e) {
      setError('Søgning fejlede: ' + e.message)
    }
    setLoading(false)
  }

  const brandLabel = slug => BRANDS.find(b => b.slug === slug)?.name ?? slug

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: 'transparent', minHeight: '100vh' }}>

      {/* Search panel */}
      <div style={{ background: '#2C4A3E', padding: '20px 24px 24px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,.5)', marginBottom: '4px', letterSpacing: '.06em' }}>
          Forhandlersøgning
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: '#EDF5F0', marginBottom: '18px' }}>
          Find garn nær dig
        </div>

        {/* City input */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="By eller postnummer — fx Hillerød eller 3400"
            style={{
              flex: '1 1 220px', padding: '10px 14px', border: '1px solid rgba(255,255,255,.2)',
              borderRadius: '8px', fontSize: '13px', background: 'rgba(255,255,255,.12)',
              color: '#fff', fontFamily: "'DM Sans', sans-serif", outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            style={{ padding: '10px 14px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', color: '#C9E6DA', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            {geoLoading ? '...' : '📍 Min placering'}
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px 22px', background: '#C16B47', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            {loading ? 'Søger...' : 'Søg'}
          </button>
        </form>

        {/* Brand pills */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>
            Mærker — vælg én eller flere (tom = alle)
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {BRANDS.map(b => {
              const active = selectedBrands.includes(b.slug)
              return (
                <button
                  key={b.slug}
                  onClick={() => toggleBrand(b.slug)}
                  style={{
                    ...pillBase,
                    background:   active ? '#EDF5F0' : 'rgba(255,255,255,.08)',
                    color:        active ? '#2C4A3E' : '#C9E6DA',
                    borderColor:  active ? '#EDF5F0' : 'rgba(255,255,255,.2)',
                    fontWeight:   active ? 600 : 400,
                  }}
                >
                  {b.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Radius */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Radius:</span>
          {RADII.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              style={{
                ...pillBase,
                padding: '3px 12px',
                background:  radius === r ? '#EDF5F0' : 'rgba(255,255,255,.08)',
                color:       radius === r ? '#2C4A3E' : '#C9E6DA',
                borderColor: radius === r ? '#EDF5F0' : 'rgba(255,255,255,.2)',
                fontWeight:  radius === r ? 600 : 400,
              }}
            >
              {r} km
            </button>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(193,107,71,.25)', borderRadius: '8px', fontSize: '12px', color: '#F5C4A8' }}>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{ padding: '20px' }}>
        {results === null && !loading && (
          <div style={{ textAlign: 'center', paddingTop: '48px', color: '#8B7D6B' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🧶</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', color: '#2C2018' }}>
              Søg efter garnbutikker nær dig
            </div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>
              Vælg et eller flere mærker og indtast din by
            </div>
          </div>
        )}

        {results !== null && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#2C2018' }}>
                {results.stores.length === 0
                  ? 'Ingen resultater'
                  : `${results.stores.length} butik${results.stores.length !== 1 ? 'ker' : ''}`}
              </span>
              <span style={{ fontSize: '12px', color: '#8B7D6B' }}>
                inden for {radius} km fra {results.label}
                {selectedBrands.length > 0 && ` · ${selectedBrands.map(brandLabel).join(', ')}`}
              </span>
            </div>

            {results.stores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B7D6B' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '13px' }}>Prøv en større radius eller færre mærker</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.stores.map(store => (
                  <div
                    key={store.id}
                    style={{
                      background: '#FFFCF7', borderRadius: '10px',
                      padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,32,24,.07)',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', fontWeight: 600, color: '#2C2018' }}>
                          {store.name}
                        </span>
                        <span style={{ fontSize: '11px', background: '#EDE7D8', color: '#6A5638', borderRadius: '20px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          {store.distance_km} km
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#8B7D6B', marginBottom: '6px' }}>
                        {[store.address, store.postcode, store.city].filter(Boolean).join(', ')}
                      </div>

                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {(store.brands ?? []).map(slug => (
                          <span key={slug} style={{ fontSize: '11px', background: '#E4EEE4', color: '#2A4A2A', borderRadius: '20px', padding: '2px 8px' }}>
                            {brandLabel(slug)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                      {store.phone && (
                        <a href={`tel:${store.phone}`} style={{ fontSize: '12px', color: '#6A5638', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          📞 {store.phone}
                        </a>
                      )}
                      {store.website && store.website !== '' && (
                        <a href={store.website.startsWith('http') ? store.website : `https://${store.website}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: '12px', color: '#2C4A3E', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Åbn website →
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.name, store.address, store.city].filter(Boolean).join(', '))}`}
                        target="_blank" rel="noreferrer"
                        style={{ fontSize: '11px', color: '#8B7D6B', textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
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
