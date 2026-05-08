'use client'

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  CircleMarker,
  useMapEvents,
} from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import type { StoreBase } from '@/lib/data/stores'

export type DanmarksKortHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void
}

export type UserLocation = {
  lat: number
  lng: number
  accuracyM?: number
  source: 'gps' | 'ip' | 'manual'
}

type Props = {
  stores: StoreBase[]
  height?: number | string
  userLocation?: UserLocation | null
  onMapClick?: (lat: number, lng: number) => void
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

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function UserLocationLayer({ location }: { location: UserLocation }) {
  return (
    <>
      {typeof location.accuracyM === 'number' && location.accuracyM > 0 && (
        <Circle
          center={[location.lat, location.lng]}
          radius={location.accuracyM}
          interactive={false}
          pathOptions={{
            color: '#9B6272',
            fillColor: '#9B6272',
            fillOpacity: 0.12,
            weight: 1.5,
          }}
        />
      )}
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={6}
        interactive={false}
        pathOptions={{
          color: '#FFFCF7',
          fillColor: '#9B6272',
          fillOpacity: 1,
          weight: 2,
        }}
      />
    </>
  )
}

const DanmarksKortClient = forwardRef<DanmarksKortHandle, Props>(function DanmarksKortClient(
  { stores, height = 460, userLocation, onMapClick },
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
        <Marker
          key={store.id}
          position={[store.lat, store.lng]}
          icon={storeIcon}
          bubblingMouseEvents={false}
        >
          <Popup>
            <StorePopup store={store} />
          </Popup>
        </Marker>
      )),
    [stores],
  )

  const showCrosshair = Boolean(onMapClick && userLocation)

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
        style={{ height: '100%', width: '100%', cursor: showCrosshair ? 'crosshair' : '' }}
        scrollWheelZoom
      >
        <MapController innerRef={mapRef} />
        {onMapClick && <MapClickHandler onClick={onMapClick} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={45}>
          {markers}
        </MarkerClusterGroup>
        {userLocation && <UserLocationLayer location={userLocation} />}
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
  // Note vises kun når store.is_strikkecafe=true (Hannahs regel:
  // "Det skal lige nu kun vises når strikkebutikken har en garncafe.").
  // Note er stadig gemt i DB for ikke-caféer — den vises bare ikke i UI.
  const showNote = store.is_strikkecafe && Boolean(store.note)
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 200, maxWidth: 260 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 4,
        }}
      >
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: '#302218' }}>
          {store.name}
        </span>
        {store.is_strikkecafe && (
          <span
            aria-label="Strikkecafé"
            title="Strikkecafé"
            style={{
              fontSize: 10,
              background: '#EAF3DE',
              color: '#173404',
              borderRadius: 999,
              padding: '2px 7px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            ☕ Café
          </span>
        )}
      </div>
      {address && <div style={{ fontSize: 12, color: '#6B5D4F', marginBottom: 6 }}>{address}</div>}
      {showNote && (
        <div
          style={{
            fontSize: 11.5,
            color: '#3F362B',
            background: '#F9F6F0',
            padding: '6px 8px',
            borderRadius: 6,
            borderLeft: '2px solid #61846D',
            lineHeight: 1.45,
            marginBottom: 6,
            fontStyle: 'italic',
          }}
        >
          {store.note}
        </div>
      )}
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
