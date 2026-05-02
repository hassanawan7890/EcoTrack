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
import { AlertTriangle, Plus, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'

const ISSUE_TYPES = ['Access Blocked', 'Container Full', 'Wrong Address', 'Hazardous Material', 'Other']

const issueColor: Record<string, string> = {
  'Access Blocked':  'text-orange-400 bg-orange-500/10',
  'Container Full':  'text-yellow-400 bg-yellow-500/10',
  'Wrong Address':   'text-blue-400 bg-blue-500/10',
  'Hazardous Material': 'text-red-400 bg-red-500/10',
  'Other':           'text-zinc-400 bg-zinc-500/10',
}

export default function CrewIssuesPage() {
  const [issues, setIssues]             = useState<any[]>([])
  const [recentPickups, setRecentPickups] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [open, setOpen]                 = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [issueType, setIssueType]       = useState('')
  const [description, setDescription]   = useState('')
  const [pickupId, setPickupId]         = useState('')
  const [photoUrl, setPhotoUrl]         = useState('')

  async function load() {
    try {
      const [issueData, pickupData] = await Promise.all([api.get('/api/issues'), api.get('/api/pickups')])
      setIssues(issueData)
      setRecentPickups(pickupData)
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
      await api.post('/api/issues', { type: issueType, description, pickup_id: pickupId ? Number(pickupId) : null, photo_url: photoUrl || null })
      setOpen(false)
      setIssueType('')
      setDescription('')
      setPickupId('')
      setPhotoUrl('')
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Issue Reports" description="Log problems encountered during your route.">
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" /> Report Issue</Button>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No issues reported yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {issues.map((issue: any) => (
              <div key={issue.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-muted-foreground/50">#{issue.id}</span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${issueColor[issue.type] ?? 'text-zinc-400 bg-zinc-500/10'}`}>{issue.type}</span>
                  </div>
                  <StatusBadge status={issue.status ?? 'Open'} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">{issue.description}</p>
                {issue.admin_notes && <p className="text-xs text-blue-400/80 italic mb-1">Admin response: {issue.admin_notes}</p>}
                <p className="text-xs text-muted-foreground/60">
                  {timeAgo(issue.created_at)}
                  {issue.pickup_id && <span> · Pickup <span className="font-mono">#{issue.pickup_id}</span></span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>Log a problem you encountered on your route.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Linked Pickup (optional)</Label>
              <Select value={pickupId} onValueChange={setPickupId}>
                <SelectTrigger><SelectValue placeholder="Select pickup to reference" /></SelectTrigger>
                <SelectContent>
                  {recentPickups.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      #{p.id} · {p.type} — {p.address?.slice(0, 40)}{p.address?.length > 40 ? '…' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType} required>
                <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue..." rows={3} required />
            </div>
            <div className="space-y-1.5">
              <Label>Photo URL (optional)</Label>
              <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} type="url" placeholder="https://..." />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
