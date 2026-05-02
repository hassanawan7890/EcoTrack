'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Package, Plus, Loader2, Scale } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export default function StaffLoadsPage() {
  const [loads, setLoads]             = useState<any[]>([])
  const [centers, setCenters]         = useState<any[]>([])
  const [crewMembers, setCrewMembers] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [open, setOpen]               = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [gross, setGross]             = useState('')
  const [tare, setTare]               = useState('')
  const [centerId, setCenterId]       = useState('')
  const [crewId, setCrewId]           = useState('')

  async function load() {
    try {
      const [loadsData, centersData, crewData] = await Promise.all([
        api.get('/api/loads'),
        api.get('/api/ref/centers'),
        api.get('/api/ref/crew'),
      ])
      setLoads(loadsData)
      setCenters(centersData)
      setCrewMembers(crewData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/api/loads', { gross_weight: Number(gross), tare_weight: Number(tare), center_id: Number(centerId), crew_id: crewId || null })
      setOpen(false)
      setGross('')
      setTare('')
      setCenterId('')
      setCrewId('')
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const netWeight = gross && tare ? (Number(gross) - Number(tare)).toFixed(1) : '—'

  return (
    <div>
      <PageHeader title="Load Records" description="Record incoming waste loads at your recycling center.">
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" /> Record Load</Button>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : loads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No loads recorded yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Load ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Center</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross (kg)</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tare (kg)</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Net (kg)</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loads.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground/60">#{l.id}</td>
                  <td className="px-5 py-4 font-medium">{l.recycling_centers?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{l.gross_weight}</td>
                  <td className="px-5 py-4 text-muted-foreground">{l.tare_weight}</td>
                  <td className="px-5 py-4 font-semibold text-primary">{l.net_weight}</td>
                  <td className="px-5 py-4 text-muted-foreground">{timeAgo(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record New Load</DialogTitle>
            <DialogDescription>Enter the load weights for incoming waste.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Recycling Center</Label>
              <Select value={centerId} onValueChange={setCenterId} required>
                <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                <SelectContent>
                  {centers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Crew Member</Label>
              <Select value={crewId} onValueChange={setCrewId} required>
                <SelectTrigger><SelectValue placeholder="Select crew" /></SelectTrigger>
                <SelectContent>
                  {crewMembers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gross Weight (kg)</Label>
                <Input type="number" step="0.1" min="0" required value={gross} onChange={(e) => setGross(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tare Weight (kg)</Label>
                <Input type="number" step="0.1" min="0" required value={tare} onChange={(e) => setTare(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <Scale className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">Net weight:</span>
              <span className="font-semibold text-primary">{netWeight} kg</span>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !centerId || !crewId}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Load'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
