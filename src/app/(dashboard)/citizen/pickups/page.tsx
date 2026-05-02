'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Truck, Plus, Loader2, X, List, Map as MapIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const MapPicker = dynamic(() => import('@/components/map/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-[284px] rounded-lg bg-muted animate-pulse" />,
})
const PickupsMap = dynamic(() => import('@/components/map/PickupsMap'), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-xl bg-muted animate-pulse" />,
})

export default function CitizenPickupsPage() {
  const [pickups, setPickups]           = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [open, setOpen]                 = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [filter, setFilter]             = useState('all')
  const [view, setView]                 = useState<'list' | 'map'>('list')
  const [pickupAddress, setPickupAddress] = useState('')
  const [type, setType]                 = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes]               = useState('')

  async function load() {
    try {
      const data = await api.get('/api/pickups')
      setPickups(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!pickupAddress) { setError('Please select a pickup location on the map.'); return }
    if (!type)          { setError('Please select a pickup type.'); return }
    setSubmitting(true)
    try {
      await api.post('/api/pickups', { type, address: pickupAddress, scheduled_date: scheduledDate, note: notes })
      setOpen(false)
      setPickupAddress('')
      setType('')
      setScheduledDate('')
      setNotes('')
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function closeDialog() {
    setOpen(false)
    setPickupAddress('')
    setType('')
    setScheduledDate('')
    setNotes('')
    setError(null)
  }

  async function handleCancel(id: number) {
    try {
      await api.patch(`/api/pickups/${id}`, { action: 'cancel' })
      load()
    } catch {}
  }

  const filtered = filter === 'all' ? pickups : pickups.filter((p) => p.status.toLowerCase() === filter)

  return (
    <div>
      <PageHeader title="My Pickups" description="Track and manage your waste pickup requests.">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setView('map')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
          </div>
          <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" /> Request Pickup</Button>
        </div>
      </PageHeader>

      <div className="flex gap-1 mb-5 p-1 bg-muted rounded-lg w-fit">
        {['all', 'pending', 'scheduled', 'completed', 'missed'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${filter === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{s}</button>
        ))}
      </div>

      {view === 'map' ? (
        loading ? <div className="h-[420px] rounded-xl bg-muted animate-pulse" /> : <PickupsMap pickups={filtered} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No pickups found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground/60">#{p.id}</td>
                    <td className="px-5 py-4 font-medium">{p.type}</td>
                    <td className="px-5 py-4 text-muted-foreground max-w-[200px] truncate">{p.address}</td>
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(p.scheduled_date)}</td>
                    <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-4 text-right">
                      {p.status === 'Pending' && (
                        <button onClick={() => handleCancel(p.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog(); else setOpen(true) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a Pickup</DialogTitle>
            <DialogDescription>Search for your address or click the map to pin your location.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Pickup Type</Label>
              <Select value={type} onValueChange={setType} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Bulk">Bulk</SelectItem>
                  <SelectItem value="Special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Date</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-1.5">
              <Label>Pickup Location</Label>
              <MapPicker onAddressChange={setPickupAddress} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions?" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={submitting || !pickupAddress}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
