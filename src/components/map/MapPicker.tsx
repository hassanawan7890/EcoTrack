'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: '',
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path fill="#22c55e" stroke="white" stroke-width="1.5" d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"/>
    <circle fill="white" cx="12" cy="12" r="4"/>
  </svg>`,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
})

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 15, { animate: true })
  }, [center, map])
  return null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

interface Props {
  onAddressChange: (address: string) => void
}

export default function MapPicker({ onAddressChange }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [address, setAddress] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const d = await res.json()
      const a = d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      setAddress(a)
      onAddressChange(a)
    } catch {
      const a = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      setAddress(a)
      onAddressChange(a)
    }
  }

  function onMapClick(lat: number, lng: number) {
    setPosition([lat, lng])
    reverseGeocode(lat, lng)
  }

  function onQueryChange(v: string) {
    setQuery(v)
    clearTimeout(timer.current)
    if (v.length < 3) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } },
        )
        setResults(await res.json())
      } finally {
        setSearching(false)
      }
    }, 600)
  }

  function selectResult(r: any) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    setPosition([lat, lng])
    setAddress(r.display_name)
    onAddressChange(r.display_name)
    setQuery('')
    setResults([])
  }

  function clear() {
    setAddress('')
    setPosition(null)
    setQuery('')
    setResults([])
    onAddressChange('')
  }

  return (
    <div className="space-y-2">
      {/* Search box */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search for your address…"
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
        {results.length > 0 && (
          <div className="absolute z-[9999] top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl text-sm max-h-44 overflow-y-auto">
            {results.map((r: any, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => selectResult(r)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border last:border-0 text-xs truncate"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 220, isolation: 'isolate' }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController center={position} />
          <ClickHandler onClick={onMapClick} />
          {position && <Marker position={position} icon={pinIcon} />}
        </MapContainer>
      </div>

      {/* Selected address or hint */}
      {address ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          <span className="truncate flex-1">{address}</span>
          <button type="button" onClick={clear} className="ml-auto hover:text-foreground transition-colors">✕</button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Search for an address above or click the map to pin your location.</p>
      )}
    </div>
  )
}
