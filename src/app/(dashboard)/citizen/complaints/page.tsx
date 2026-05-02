'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ClipboardList, Plus, Loader2, Truck } from 'lucide-react'
import { formatDate, timeAgo } from '@/lib/utils'

export default function CitizenComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [myPickups, setMyPickups]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [open, setOpen]             = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [subject, setSubject]       = useState('')
  const [description, setDescription] = useState('')
  const [pickupId, setPickupId]     = useState('')

  async function load() {
    try {
      const [cData, pData] = await Promise.all([api.get('/api/complaints'), api.get('/api/pickups')])
      setComplaints(cData)
      setMyPickups(pData.filter((p: any) => p.status !== 'Cancelled'))
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
      await api.post('/api/complaints', { subject, description, pickup_id: pickupId ? Number(pickupId) : null })
      setOpen(false)
      setSubject('')
      setDescription('')
      setPickupId('')
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const open_ = complaints.filter((c) => c.status === 'Open').length
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length
  const resolved = complaints.filter((c) => c.status === 'Resolved').length

  return (
    <div>
      <PageHeader title="Complaints" description="Submit and track your service complaints.">
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" /> New Complaint</Button>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: complaints.length, color: 'text-foreground' },
          { label: 'Open', value: open_, color: 'text-red-400' },
          { label: 'In Progress', value: inProgress, color: 'text-amber-400' },
          { label: 'Resolved', value: resolved, color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No complaints submitted</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {complaints.map((c: any) => (
              <div key={c.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground/50">#{c.id}</span>
                      <p className="text-sm font-medium">{c.subject}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                    {c.pickup_requests && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Truck className="w-3 h-3 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground/70">
                          Pickup #{c.pickup_requests.id} · {c.pickup_requests.type} · {c.pickup_requests.address?.slice(0, 50)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(c.created_at)}</span>
                </div>
                {c.resolved_at && <p className="text-xs text-emerald-500 mt-2">Resolved {formatDate(c.resolved_at)}</p>}
                {c.resolution_notes && <p className="text-xs text-emerald-400/80 mt-1 italic">Response: {c.resolution_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit a Complaint</DialogTitle>
            <DialogDescription>Describe your service issue and we'll look into it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Related Pickup (optional)</Label>
              <Select value={pickupId} onValueChange={setPickupId}>
                <SelectTrigger><SelectValue placeholder="Select a pickup this is about" /></SelectTrigger>
                <SelectContent>
                  {myPickups.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      #{p.id} · {p.type} — {p.address?.slice(0, 40)}{p.address?.length > 40 ? '…' : ''} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of the issue" required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4} required />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
