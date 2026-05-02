'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ClipboardList, Truck, User, Calendar, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { formatDate, timeAgo } from '@/lib/utils'

interface Pickup {
  id: number
  type: string
  address: string
  scheduled_date: string
  status: string
}

interface Complaint {
  id: number
  subject: string
  description: string
  status: string
  created_at: string
  resolved_at: string | null
  resolution_notes: string | null
  pickup_id: number | null
  profiles: { full_name: string; email?: string } | null
  pickup_requests: Pickup | null
}

export function ComplaintsSection({ complaints }: { complaints: Complaint[] }) {
  const [selected, setSelected] = useState<Complaint | null>(null)
  const [response, setResponse] = useState('')
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  function openComplaint(c: Complaint) { setSelected(c); setResponse('') }
  function closeComplaint() { setSelected(null); setResponse('') }

  async function handleInProgress() {
    if (!selected) return
    setIsPending(true)
    try {
      await api.patch(`/api/complaints/${selected.id}`, { action: 'in-progress' })
      closeComplaint()
      router.refresh()
    } finally { setIsPending(false) }
  }

  async function handleResolve() {
    if (!selected) return
    setIsPending(true)
    try {
      await api.patch(`/api/complaints/${selected.id}`, { action: 'resolve', resolution_notes: response })
      closeComplaint()
      router.refresh()
    } finally { setIsPending(false) }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No complaints</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
            {complaints.map((c) => (
              <button
                key={c.id}
                onClick={() => openComplaint(c)}
                className="w-full text-left px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground/50 flex-shrink-0">#{c.id}</span>
                    <p className="text-sm font-medium truncate">{c.subject}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{c.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                  <span>{c.profiles?.full_name ?? '—'}</span>
                  <span>·</span>
                  <span>{timeAgo(c.created_at)}</span>
                  {c.pickup_id && <span className="text-primary/60">· Pickup #{c.pickup_id}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeComplaint() }}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span className="text-xs font-mono text-muted-foreground/60">#{selected.id}</span>
                {selected.subject}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Status + dates */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-muted-foreground">{timeAgo(selected.created_at)}</span>
                {selected.resolved_at && (
                  <span className="text-xs text-emerald-500">Resolved {formatDate(selected.resolved_at)}</span>
                )}
              </div>

              {/* Citizen */}
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{selected.profiles?.full_name ?? 'Unknown'}</span>
                {selected.profiles?.email && (
                  <span className="text-xs text-muted-foreground truncate">({selected.profiles.email})</span>
                )}
              </div>

              {/* Complaint text */}
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>
              </div>

              {/* Referenced pickup */}
              {selected.pickup_requests && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Referenced Pickup #{selected.pickup_requests.id}</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground/80">Type:</span> {selected.pickup_requests.type}</p>
                    <p><span className="font-medium text-foreground/80">Address:</span> {selected.pickup_requests.address}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(selected.pickup_requests.scheduled_date)}
                      </span>
                      <StatusBadge status={selected.pickup_requests.status} />
                    </div>
                  </div>
                </div>
              )}

              {/* Previous admin response */}
              {selected.resolution_notes && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-xs font-semibold text-emerald-400 mb-1">Admin Response Sent</p>
                  <p className="text-sm text-emerald-300/80">{selected.resolution_notes}</p>
                </div>
              )}

              {/* Action area — always a visible textarea + buttons */}
              {selected.status !== 'Resolved' && (
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Response to citizen <span className="text-muted-foreground font-normal">(optional — sent as notification)</span>
                    </Label>
                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Type your response here... e.g. 'Your complaint is being reviewed, we will dispatch a crew on Thursday.'"
                      rows={3}
                      className="text-sm resize-none"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.status === 'Open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleInProgress}
                        disabled={isPending}
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                        Mark In Progress
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleResolve}
                      disabled={isPending}
                      className="ml-auto bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      {response.trim() ? 'Resolve & Send Response' : 'Resolve'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
