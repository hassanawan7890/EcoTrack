'use client'

import { MapContainer, TileLayer, Polygon, Polyline, Tooltip, CircleMarker, useMapEvents, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'

const WINDSOR_CENTER: [number, number] = [42.3149, -83.0364]

const ZONE_COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#f59e0b']

const FALLBACK_POLYGONS: Record<string, [number, number][]> = {
  Downtown:   [[42.323,-83.050],[42.323,-83.030],[42.312,-83.030],[42.312,-83.050]],
  Riverside:  [[42.312,-83.062],[42.312,-83.020],[42.300,-83.020],[42.300,-83.062]],
  University: [[42.320,-83.082],[42.320,-83.062],[42.300,-83.062],[42.300,-83.082]],
  Industrial: [[42.332,-83.030],[42.332,-82.990],[42.312,-82.990],[42.312,-83.030]],
  Suburban:   [[42.360,-83.065],[42.360,-83.025],[42.332,-83.025],[42.332,-83.065]],
}

interface Zone {
  id: number
  name: string
  description?: string
  coordinates?: [number, number][] | null
}

interface Props {
  zones: Zone[]
  drawingMode?: boolean
  drawnPoints?: [number, number][]
  onAddPoint?: (pt: [number, number]) => void
}

function FitBounds({ zones }: { zones: Zone[] }) {
  const map = useMap()
  useEffect(() => {
    const allCoords = zones.flatMap((z) => z.coordinates ?? FALLBACK_POLYGONS[z.name] ?? [])
    if (allCoords.length === 0) return
    const lats = allCoords.map((c) => c[0])
    const lngs = allCoords.map((c) => c[1])
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [24, 24] })
  }, [map, zones])
  return null
}

function PointAdder({ onAdd }: { onAdd: (pt: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function ZonesMap({ zones, drawingMode = false, drawnPoints = [], onAddPoint }: Props) {
  return (
    <div className="rounded-xl overflow-hidden border border-border mb-6 relative" style={{ height: 460, isolation: 'isolate' }}>
      {drawingMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] bg-card/95 backdrop-blur border border-primary/30 rounded-lg px-4 py-2 text-xs text-center shadow-lg pointer-events-none">
          <p className="font-semibold text-primary">Drawing Mode — click to add boundary points</p>
          <p className="text-muted-foreground mt-0.5">
            {drawnPoints.length} point{drawnPoints.length !== 1 ? 's' : ''} added
            {drawnPoints.length >= 3 ? ' · click "Finish Zone" when done' : ' · need at least 3 points'}
          </p>
        </div>
      )}

      <MapContainer
        center={WINDSOR_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        doubleClickZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds zones={zones} />

        {/* Existing zone polygons */}
        {zones.map((z, i) => {
          const coords = z.coordinates ?? FALLBACK_POLYGONS[z.name]
          if (!coords || coords.length < 3) return null
          const color = ZONE_COLORS[i % ZONE_COLORS.length]
          return (
            <Polygon
              key={z.id}
              positions={coords}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2 }}
            >
              <Tooltip sticky><span className="text-xs font-medium">{z.name}</span></Tooltip>
            </Polygon>
          )
        })}

        {/* Drawing point capture */}
        {drawingMode && onAddPoint && <PointAdder onAdd={onAddPoint} />}

        {/* In-progress polygon preview */}
        {drawnPoints.length >= 2 && (
          <Polyline
            positions={[...drawnPoints, drawnPoints[0]]}
            pathOptions={{ color: '#3b82f6', weight: 2.5, dashArray: '6 4', opacity: 0.9 }}
          />
        )}
        {drawnPoints.map((pt, i) => (
          <CircleMarker
            key={i}
            center={pt}
            radius={i === 0 ? 7 : 5}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent={i === 0} direction="top">
              <span className="text-xs">{i === 0 ? 'Start' : `Pt ${i + 1}`}</span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
