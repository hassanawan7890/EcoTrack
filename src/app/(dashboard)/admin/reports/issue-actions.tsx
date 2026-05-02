'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { CheckCircle, Eye, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function IssueActions({ id, status }: { id: number; status: string }) {
  const [isPending, setIsPending] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [pendingStatus, setPendingStatus] = useState<'Reviewed' | 'Closed' | null>(null)
  const router = useRouter()

  async function submit() {
    if (!pendingStatus) return
    setIsPending(true)
    try {
      await api.patch(`/api/issues/${id}`, { status: pendingStatus, admin_notes: adminNotes })
      setShowNotes(false)
      setAdminNotes('')
      router.refresh()
    } finally { setIsPending(false) }
  }

  if (status === 'Closed') return null

  if (showNotes) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <input
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder={`Notes for crew (optional)`}
          className="flex-1 text-xs px-2 py-1 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <button
          onClick={submit}
          disabled={isPending}
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Confirm
        </button>
        <button onClick={() => setShowNotes(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'Open' && (
        <button
          onClick={() => { setPendingStatus('Reviewed'); setShowNotes(true) }}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Acknowledge
        </button>
      )}
      <button
        onClick={() => { setPendingStatus('Closed'); setShowNotes(true) }}
        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <CheckCircle className="w-3 h-3" />
        Close
      </button>
    </div>
  )
}
