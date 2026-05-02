'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDate } from '@/lib/utils'

const statusColors: Record<string, string> = {
  Pending: '#f59e0b',
  Scheduled: '#3b82f6',
  Completed: '#22c55e',
  Missed: '#ef4444',
  Cancelled: '#6b7280',
}

function makePin(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path fill="${color}" stroke="white" stroke-width="1.5" d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"/>
      <circle fill="white" cx="12" cy="12" r="4"/>
    </svg>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  })
}

interface Pickup {
  id: number
  address: string
  type: string
  status: string
  scheduled_date: string
}

async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    )
    const data = await res.json()
    if (!data.length) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {
    return null
  }
}

export default function PickupsMap({ pickups }: { pickups: Pickup[] }) {
  const [markers, setMarkers] = useState<{ pickup: Pickup; pos: [number, number] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const out: { pickup: Pickup; pos: [number, number] }[] = []
      for (const p of pickups) {
        await new Promise((r) => setTimeout(r, 250))
        const pos = await geocode(p.address)
        if (pos) out.push({ pickup: p, pos })
      }
      setMarkers(out)
      setLoading(false)
    }
    if (pickups.length > 0) load()
    else setLoading(false)
  }, [pickups])

  return (
    <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 420, isolation: 'isolate' }}>
      {loading && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Locating addresses…</p>
        </div>
      )}

      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {markers.map(({ pickup, pos }) => (
          <Marker key={pickup.id} position={pos} icon={makePin(statusColors[pickup.status] ?? '#6b7280')}>
            <Popup>
              <div className="text-sm space-y-0.5 min-w-[160px]">
                <p className="font-semibold">{pickup.type} Pickup</p>
                <p className="text-gray-500 text-xs">{pickup.address}</p>
                <p className="text-gray-500 text-xs">{formatDate(pickup.scheduled_date)}</p>
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: (statusColors[pickup.status] ?? '#6b7280') + '20', color: statusColors[pickup.status] ?? '#6b7280' }}
                >
                  {pickup.status}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[400] bg-white/90 backdrop-blur-sm rounded-lg p-2.5 shadow text-xs space-y-1.5">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-gray-700">{status}</span>
          </div>
        ))}
      </div>

      {!loading && markers.length === 0 && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
          <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground text-center shadow">
            No locations could be found.<br />
            <span className="text-xs">Use real addresses when submitting pickups.</span>
          </div>
        </div>
      )}
    </div>
  )
}
