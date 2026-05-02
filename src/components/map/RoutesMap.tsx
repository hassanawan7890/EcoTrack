'use client'

import { MapContainer, TileLayer, Polygon, Polyline, Tooltip, Marker, CircleMarker, useMapEvents, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const WINDSOR_CENTER: [number, number] = [42.3149, -83.0364]
const ZONE_COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#f59e0b', '#14b8a6', '#8b5cf6', '#ef4444']

// Fallback paths for routes created before path_coordinates column existed
const LEGACY_PATHS: Record<string, [number, number][]> = {
  'Route A — Downtown':   [[42.321,-83.048],[42.319,-83.044],[42.317,-83.040],[42.315,-83.036],[42.313,-83.032]],
  'Route B — Riverside':  [[42.310,-83.058],[42.310,-83.048],[42.309,-83.038],[42.309,-83.028],[42.308,-83.022]],
  'Route C — University': [[42.318,-83.078],[42.314,-83.072],[42.310,-83.068],[42.305,-83.065]],
  'Route D — Industrial': [[42.328,-83.028],[42.324,-83.018],[42.320,-83.008],[42.316,-82.995]],
  'Route E — Suburban':   [[42.354,-83.060],[42.348,-83.050],[42.343,-83.042],[42.338,-83.034],[42.333,-83.028]],
}

function labelIcon(text: string, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${text}</div>`,
    iconAnchor: [40, 10],
  })
}

interface Zone {
  id: number
  name: string
  coordinates?: [number, number][] | null
}

interface Route {
  id: number
  name: string
  schedule_day: string
  is_active: boolean
  path_coordinates?: [number, number][] | null
  zones?: { name: string }
  profiles?: { full_name: string }
}

interface Props {
  routes: Route[]
  zones?: Zone[]
  drawingMode?: boolean
  drawnPoints?: [number, number][]
  onAddPoint?: (pt: [number, number]) => void
}

function FitBounds({ zones, routes }: { zones: Zone[]; routes: Route[] }) {
  const map = useMap()
  useEffect(() => {
    const zoneCoords = zones.flatMap((z) => z.coordinates ?? [])
    const routeCoords = routes.flatMap((r) => r.path_coordinates ?? LEGACY_PATHS[r.name] ?? [])
    const allCoords = [...zoneCoords, ...routeCoords]
    if (allCoords.length === 0) {
      map.setView(WINDSOR_CENTER, 12)
      return
    }
    const lats = allCoords.map((c) => c[0])
    const lngs = allCoords.map((c) => c[1])
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [24, 24] })
  }, [map, zones, routes])
  return null
}

function PointAdder({ onAdd }: { onAdd: (pt: [number, number]) => void }) {
  useMapEvents({
    click(e) { onAdd([e.latlng.lat, e.latlng.lng]) },
  })
  return null
}

export default function RoutesMap({ routes, zones = [], drawingMode = false, drawnPoints = [], onAddPoint }: Props) {
  const zoneColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    zones.forEach((z, i) => {
      map[z.name] = ZONE_COLORS[i % ZONE_COLORS.length]
    })
    return map
  }, [zones])

  return (
    <div className="rounded-xl overflow-hidden border border-border relative" style={{ height: 460, isolation: 'isolate' }}>
      {drawingMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] bg-card/95 backdrop-blur border border-primary/30 rounded-lg px-4 py-2 text-xs text-center shadow-lg pointer-events-none">
          <p className="font-semibold text-primary">Drawing Mode — click to add route waypoints</p>
          <p className="text-muted-foreground mt-0.5">
            {drawnPoints.length} point{drawnPoints.length !== 1 ? 's' : ''} added
            {drawnPoints.length >= 2 ? ' · click "Finish Route" when done' : ' · need at least 2 points'}
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
        <FitBounds zones={zones} routes={routes} />

        {/* Zone boundary shading from real DB zones */}
        {zones.map((z, i) => {
          if (!z.coordinates || z.coordinates.length < 3) return null
          const color = ZONE_COLORS[i % ZONE_COLORS.length]
          return (
            <Polygon
              key={z.id}
              positions={z.coordinates}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 1.5, dashArray: '4 4' }}
            >
              <Tooltip sticky><span className="text-xs font-medium">{z.name}</span></Tooltip>
            </Polygon>
          )
        })}

        {/* Route polylines */}
        {routes.map((r) => {
          const path = r.path_coordinates ?? LEGACY_PATHS[r.name]
          if (!path || path.length < 2) return null
          const zoneName = r.zones?.name ?? ''
          const color = zoneColorMap[zoneName] ?? '#6b7280'
          return (
            <Polyline
              key={r.id}
              positions={path}
              pathOptions={{ color, weight: 4, opacity: r.is_active ? 1 : 0.4 }}
            >
              <Tooltip sticky>
                <div className="text-sm">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-gray-500 text-xs">Zone: {zoneName || '—'}</p>
                  <p className="text-gray-500 text-xs">Crew: {r.profiles?.full_name ?? 'Unassigned'}</p>
                  <p className="text-gray-500 text-xs">{r.schedule_day}s</p>
                </div>
              </Tooltip>
            </Polyline>
          )
        })}

        {/* Route start markers */}
        {routes.map((r) => {
          const path = r.path_coordinates ?? LEGACY_PATHS[r.name]
          if (!path || path.length < 2) return null
          const zoneName = r.zones?.name ?? ''
          const color = zoneColorMap[zoneName] ?? '#6b7280'
          return (
            <Marker key={`lbl-${r.id}`} position={path[0]} icon={labelIcon(r.name.split('—')[0].trim(), color)} />
          )
        })}

        {/* Drawing mode */}
        {drawingMode && onAddPoint && <PointAdder onAdd={onAddPoint} />}

        {drawnPoints.length >= 2 && (
          <Polyline
            positions={drawnPoints}
            pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '6 4', opacity: 0.9 }}
          />
        )}
        {drawnPoints.map((pt, i) => (
          <CircleMarker
            key={i}
            center={pt}
            radius={i === 0 || i === drawnPoints.length - 1 ? 7 : 5}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent={i === 0} direction="top">
              <span className="text-xs">{i === 0 ? 'Start' : i === drawnPoints.length - 1 ? 'End' : `${i + 1}`}</span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      {!drawingMode && zones.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 px-1">
          {zones.map((z, i) => (
            <div key={z.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
              {z.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
