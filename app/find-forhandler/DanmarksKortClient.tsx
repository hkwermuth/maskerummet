'use client'

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import type { StoreBase } from '@/lib/data/stores'

export type DanmarksKortHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void
}

type Props = {
  stores: StoreBase[]
  height?: number | string
}

// Custom SVG-ikon i Striq-palet. Leaflet default marker har path-problemer
// i Next, så vi laver et eget divIcon. Farve matcher #9B6272 (link-accent).
const storeIcon = L.divIcon({
  className: 'striq-marker',
  html: `
    <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0 C5.5 0 0 7.5 0 15 C0 26 15 38 15 38 C15 38 30 26 30 15 C30 7.5 24.5 0 15 0 Z"
            fill="#9B6272" stroke="#FFFCF7" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="6" fill="#FFFCF7"/>
    </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
  popupAnchor: [0, -36],
})

function MapController({ innerRef }: { innerRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()
  innerRef.current = map
  return null
}

const DanmarksKortClient = forwardRef<DanmarksKortHandle, Props>(function DanmarksKortClient(
  { stores, height = 460 },
  ref,
) {
  const mapRef = useRef<LeafletMap | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 11) {
      mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.8 })
    },
  }))

  const markers = useMemo(
    () =>
      stores.map(store => (
        <Marker key={store.id} position={[store.lat, store.lng]} icon={storeIcon}>
          <Popup>
            <StorePopup store={store} />
          </Popup>
        </Marker>
      )),
    [stores],
  )

  return (
    <div
      style={{
        height,
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(48,34,24,.1)',
        background: '#F4EFE6',
      }}
    >
      <MapContainer
        center={[56.0, 10.5]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <MapController innerRef={mapRef} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={45}>
          {markers}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
})

function StorePopup({ store }: { store: StoreBase }) {
  const address = [store.address, store.postcode, store.city].filter(Boolean).join(', ')
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [store.name, store.address, store.city].filter(Boolean).join(', '),
  )}`
  const websiteHref = store.website
    ? store.website.startsWith('http')
      ? store.website
      : `https://${store.website}`
    : null
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 200 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: '#302218', marginBottom: 4 }}>
        {store.name}
      </div>
      {address && <div style={{ fontSize: 12, color: '#6B5D4F', marginBottom: 6 }}>{address}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {store.phone && (
          <a href={`tel:${store.phone}`} style={{ fontSize: 12, color: '#302218', textDecoration: 'none' }}>
            📞 {store.phone}
          </a>
        )}
        {websiteHref && (
          <a href={websiteHref} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#61846D', fontWeight: 500, textDecoration: 'none' }}>
            Åbn website →
          </a>
        )}
        <a href={mapsHref} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6B5D4F', textDecoration: 'none' }}>
          Vis på Google Maps ↗
        </a>
      </div>
    </div>
  )
}

export default DanmarksKortClient
