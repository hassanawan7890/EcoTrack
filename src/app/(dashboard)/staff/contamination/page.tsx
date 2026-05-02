'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Beaker, Plus, Loader2, AlertTriangle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

const CONTAMINATION_TYPES = ['Chemical', 'Biological', 'Mixed Material', 'Hazardous', 'Food Waste', 'Electronics', 'Other']

function ContaminationLevel({ percent }: { percent: number }) {
  const color = percent >= 30 ? 'text-red-400 bg-red-500/10' : percent >= 15 ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', percent >= 30 ? 'bg-red-500' : percent >= 15 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', color)}>{percent}%</span>
    </div>
  )
}

export default function StaffContaminationPage() {
  const [reports, setReports]       = useState<any[]>([])
  const [loads, setLoads]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [open, setOpen]             = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [loadId, setLoadId]         = useState('')
  const [type, setType]             = useState('')
  const [percent, setPercent]       = useState('')
  const [notes, setNotes]           = useState('')

  async function load() {
    try {
      const [rData, lData] = await Promise.all([api.get('/api/contamination'), api.get('/api/loads')])
      setReports(rData)
      setLoads(lData)
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
      await api.post('/api/contamination', { load_id: Number(loadId), type, percent: Number(percent), notes: notes || null })
      setOpen(false)
      setLoadId('')
      setType('')
      setPercent('')
      setNotes('')
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Contamination Reports" description="Track contamination incidents and percentages.">
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" /> Report</Button>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Beaker className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No contamination reports</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reports.map((r: any) => (
              <div key={r.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-sm font-medium">{r.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Load #{r.load_id} · {r.load_data?.load_date}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                </div>
                <ContaminationLevel percent={r.percent} />
                {r.notes && <p className="text-xs text-muted-foreground mt-2">{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Contamination</DialogTitle>
            <DialogDescription>Log a contamination incident for a specific load.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Load</Label>
              <Select value={loadId} onValueChange={setLoadId} required>
                <SelectTrigger><SelectValue placeholder="Select load" /></SelectTrigger>
                <SelectContent>
                  {loads.map((l: any) => <SelectItem key={l.id} value={String(l.id)}>Load #{l.id} — {l.load_date}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contamination Type</Label>
              <Select value={type} onValueChange={setType} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {CONTAMINATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contamination % (0–100)</Label>
              <Input type="number" min="0" max="100" step="0.1" placeholder="e.g. 12.5" value={percent} onChange={(e) => setPercent(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional observations..." />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !loadId || !type}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
