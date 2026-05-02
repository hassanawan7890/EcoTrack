'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Truck, Loader2, CheckCircle, List, Map as MapIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const PickupsMap = dynamic(() => import('@/components/map/PickupsMap'), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-xl bg-muted animate-pulse" />,
})

export default function CrewPickupsPage() {
  const [pickups, setPickups]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [view, setView]         = useState<'list' | 'map'>('list')

  async function load() {
    try {
      const data = await api.get('/api/pickups')
      setPickups(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !newStatus) return
    setSubmitting(true)
    try {
      await api.patch(`/api/pickups/${selected.id}`, { status: newStatus, notes })
      setSelected(null)
      setNotes('')
      load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Pickup Routes" description="View and update the status of all assigned pickups.">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setView('map')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <MapIcon className="w-3.5 h-3.5" /> Map
          </button>
        </div>
      </PageHeader>

      {view === 'map' && (loading ? <div className="h-[420px] rounded-xl bg-muted animate-pulse" /> : <PickupsMap pickups={pickups} />)}

      {view === 'list' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : pickups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No pickups to display</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Citizen</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pickups.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground/60">#{p.id}</td>
                    <td className="px-5 py-4 font-medium">{p.profiles?.full_name ?? '—'}</td>
                    <td className="px-5 py-4 text-muted-foreground">{p.type}</td>
                    <td className="px-5 py-4 text-muted-foreground">{p.address}</td>
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(p.scheduled_date)}</td>
                    <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setSelected(p); setNewStatus(p.status) }}>Update</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNotes('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Pickup Status</DialogTitle></DialogHeader>
          {selected && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Pickup ID:</span> <span className="font-mono text-xs">#{selected.id}</span></p>
                <p><span className="text-muted-foreground">Type:</span> {selected.type}</p>
                <p><span className="text-muted-foreground">Address:</span> {selected.address}</p>
                <p><span className="text-muted-foreground">Date:</span> {formatDate(selected.scheduled_date)}</p>
              </div>
              <div className="space-y-1.5">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this pickup..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setSelected(null); setNotes('') }}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Save</>}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
