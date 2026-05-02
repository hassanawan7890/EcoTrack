'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Route, Plus, Loader2, Truck, CheckCircle, X, RotateCcw } from 'lucide-react'

const RoutesMap = dynamic(() => import('@/components/map/RoutesMap'), {
  ssr: false,
  loading: () => <div className="h-[460px] rounded-xl bg-muted animate-pulse mb-6" />,
})

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AdminRoutesPage() {
  const [routes, setRoutes]         = useState<any[]>([])
  const [zones, setZones]           = useState<any[]>([])
  const [crews, setCrews]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [open, setOpen]             = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [drawingMode, setDrawingMode] = useState(false)
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([])
  const [name, setName]             = useState('')
  const [zoneId, setZoneId]         = useState('')
  const [crewId, setCrewId]         = useState('')
  const [scheduleDay, setScheduleDay] = useState('')

  async function load() {
    try {
      const [rData, zData, cData] = await Promise.all([
        api.get('/api/admin/routes'),
        api.get('/api/ref/zones'),
        api.get('/api/ref/crew'),
      ])
      setRoutes(rData)
      setZones(zData)
      setCrews(cData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const body: any = { name, zone_id: Number(zoneId), schedule_day: scheduleDay, crew_id: crewId || null }
    if (drawnPoints.length >= 2) body.path_coordinates = drawnPoints
    try {
      await api.post('/api/admin/routes', body)
      closeDialog()
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function startDrawing() { setDrawnPoints([]); setDrawingMode(true) }
  function finishDrawing() { setDrawingMode(false); setOpen(true) }
  function cancelDrawing() { setDrawingMode(false); setDrawnPoints([]) }

  function closeDialog() {
    setOpen(false)
    setDrawnPoints([])
    setName('')
    setZoneId('')
    setCrewId('')
    setScheduleDay('')
    setError(null)
  }

  return (
    <div>
      <PageHeader title="Route Management" description="Draw a route path on the map, then configure it.">
        {drawingMode ? (
          <div className="flex items-center gap-2">
            <Button onClick={finishDrawing} size="sm" disabled={drawnPoints.length < 2}>
              <CheckCircle className="w-4 h-4" />
              Finish Route{drawnPoints.length >= 2 ? ` (${drawnPoints.length} pts)` : ' — need 2+'}
            </Button>
            <Button onClick={() => setDrawnPoints([])} size="sm" variant="ghost" disabled={drawnPoints.length === 0}>
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </Button>
            <Button onClick={cancelDrawing} size="sm" variant="outline">
              <X className="w-4 h-4" /> Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={startDrawing} size="sm" disabled={loading}>
            <Plus className="w-4 h-4" /> Draw Route
          </Button>
        )}
      </PageHeader>

      {!loading && (
        <div className="mb-6">
          <RoutesMap
            routes={routes}
            zones={zones}
            drawingMode={drawingMode}
            drawnPoints={drawnPoints}
            onAddPoint={(pt) => setDrawnPoints((prev) => [...prev, pt])}
          />
        </div>
      )}
      {loading && <div className="h-[460px] rounded-xl bg-muted animate-pulse mb-6" />}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Route className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No routes yet — draw one on the map above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Zone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Crew</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Schedule</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Path</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {routes.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground/60">#{r.id}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="font-medium">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{r.zones?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{r.profiles?.full_name ?? 'Unassigned'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{r.schedule_day}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground/60">
                    {r.path_coordinates?.length >= 2
                      ? <span className="text-emerald-400/80">{r.path_coordinates.length} waypoints</span>
                      : <span className="text-muted-foreground/40">Legacy path</span>
                    }
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${r.is_active ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20' : 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Route</DialogTitle>
            <DialogDescription>
              {drawnPoints.length >= 2
                ? `Path captured with ${drawnPoints.length} waypoints. Fill in the route details.`
                : 'No path drawn — route will appear in the table without a map line.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Route Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Route A — Downtown East" required />
            </div>
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Select value={zoneId} onValueChange={setZoneId} required>
                <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>
                  {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assign Crew</Label>
              <Select value={crewId} onValueChange={setCrewId}>
                <SelectTrigger><SelectValue placeholder="Select crew member (optional)" /></SelectTrigger>
                <SelectContent>
                  {crews.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Schedule Day</Label>
              <Select value={scheduleDay} onValueChange={setScheduleDay} required>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {drawnPoints.length >= 2 && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <span className="text-xs text-emerald-400">{drawnPoints.length} waypoints drawn</span>
                <button type="button" onClick={() => setDrawnPoints([])} className="text-xs text-muted-foreground hover:text-destructive">Clear path</button>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={submitting || !zoneId || !scheduleDay}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Route'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
