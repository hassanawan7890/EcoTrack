'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Map, Plus, Loader2, Pencil, X, CheckCircle, RotateCcw } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const ZonesMap = dynamic(() => import('@/components/map/ZonesMap'), {
  ssr: false,
  loading: () => <div className="h-[460px] rounded-xl bg-muted animate-pulse mb-6" />,
})

export default function AdminZonesPage() {
  const [zones, setZones]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [open, setOpen]             = useState(false)
  const [editing, setEditing]       = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [drawingMode, setDrawingMode] = useState(false)
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([])
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    try {
      const data = await api.get('/api/admin/zones')
      setZones(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const body: any = { name, description }
    if (drawnPoints.length >= 3) body.coordinates = drawnPoints
    try {
      if (editing) {
        await api.patch(`/api/admin/zones/${editing.id}`, body)
      } else {
        await api.post('/api/admin/zones', body)
      }
      closeDialog()
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function startDrawing() { setEditing(null); setDrawnPoints([]); setDrawingMode(true) }
  function finishDrawing() { setDrawingMode(false); setOpen(true) }
  function cancelDrawing() { setDrawingMode(false); setDrawnPoints([]) }

  function openEdit(zone: any) {
    setEditing(zone)
    setName(zone.name ?? '')
    setDescription(zone.description ?? '')
    setDrawnPoints(zone.coordinates ?? [])
    setDrawingMode(false)
    setOpen(true)
  }

  function startRedraw() { setDrawnPoints([]); setOpen(false); setDrawingMode(true) }

  function closeDialog() {
    setOpen(false)
    setEditing(null)
    setDrawnPoints([])
    setName('')
    setDescription('')
    setError(null)
  }

  return (
    <div>
      <PageHeader title="Zone Management" description="Draw zone boundaries on the map, then name them.">
        {drawingMode ? (
          <div className="flex items-center gap-2">
            <Button onClick={finishDrawing} size="sm" disabled={drawnPoints.length < 3}>
              <CheckCircle className="w-4 h-4" />
              Finish Zone{drawnPoints.length >= 3 ? ` (${drawnPoints.length} pts)` : ' — need 3+'}
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
            <Plus className="w-4 h-4" /> Draw Zone
          </Button>
        )}
      </PageHeader>

      {!loading && (
        <ZonesMap zones={zones} drawingMode={drawingMode} drawnPoints={drawnPoints} onAddPoint={(pt) => setDrawnPoints((prev) => [...prev, pt])} />
      )}
      {loading && <div className="h-[460px] rounded-xl bg-muted animate-pulse mb-6" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.length === 0 && !loading ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center border border-border rounded-xl bg-card">
            <Map className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No zones yet — draw one on the map above</p>
          </div>
        ) : zones.map((z: any) => (
          <div key={z.id} className="rounded-xl border border-border bg-card p-5 card-hover">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Map className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{z.name}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground/50">Zone #{z.id}</span>
                </div>
              </div>
              <button onClick={() => openEdit(z)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3 min-h-[2.5rem]">{z.description ?? 'No description.'}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground/60">Created {formatDate(z.created_at)}</p>
              {z.coordinates?.length >= 3
                ? <span className="text-[10px] text-emerald-400/80">{z.coordinates.length} boundary pts</span>
                : <span className="text-[10px] text-muted-foreground/40">No boundary</span>
              }
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Zone' : 'Name Your Zone'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the zone name and description.'
                : drawnPoints.length >= 3
                  ? `Boundary captured with ${drawnPoints.length} points. Give it a name.`
                  : 'No boundary drawn — zone will appear in the list without a map polygon.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Zone Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Downtown, Riverside..." required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this zone..." />
            </div>
            {drawnPoints.length >= 3 ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <span className="text-xs text-emerald-400">{drawnPoints.length} boundary points ready</span>
                <button type="button" onClick={() => setDrawnPoints([])} className="text-xs text-muted-foreground hover:text-destructive">Clear</button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-border px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {editing?.coordinates?.length >= 3 ? `Current: ${editing.coordinates.length} boundary pts` : 'No boundary set'}
                </span>
                <button type="button" onClick={startRedraw} className="text-xs text-primary hover:underline">
                  {editing?.coordinates?.length >= 3 ? 'Redraw' : 'Draw on map'}
                </button>
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Save Changes' : 'Create Zone'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
