import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { ComplaintsSection } from './complaints-section'
import { IssueActions } from './issue-actions'
import { AlertTriangle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export const metadata: Metadata = { title: 'Reports' }

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role}/dashboard`)

  const [
    { data: complaints },
    { data: issues },
    { data: pickupStats },
  ] = await Promise.all([
    supabase
      .from('complaints')
      .select('*, profiles!citizen_id(full_name, email), pickup_requests(id, type, address, scheduled_date, status)')
      .order('created_at', { ascending: false }),
    supabase.from('issue_reports').select('*, profiles!crew_id(full_name)').order('created_at', { ascending: false }).limit(30),
    supabase.from('pickup_requests').select('status'),
  ])

  const stats = (pickupStats ?? []).reduce<Record<string, number>>((acc, p: any) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader title="Reports" description="Click any complaint to view details and respond." />

      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {['Completed', 'Pending', 'Missed', 'Scheduled'].map((s) => (
          <div key={s} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{stats[s] ?? 0}</p>
            <StatusBadge status={s} className="mt-1" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Complaints — clickable, opens detail dialog */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <h2 className="font-semibold text-sm">All Complaints ({complaints?.length ?? 0})</h2>
            <span className="text-xs text-muted-foreground ml-auto">click a row to open</span>
          </div>
          <ComplaintsSection complaints={(complaints ?? []) as any} />
        </div>

        {/* Issue reports */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-sm">Crew Issue Reports ({issues?.length ?? 0})</h2>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {issues && issues.length > 0 ? (
              <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
                {issues.map((r: any) => (
                  <div key={r.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-muted-foreground/50">#{r.id}</span>
                        <span className="text-xs font-medium text-amber-400 bg-amber-500/10 rounded-md px-1.5 py-0.5">{r.type}</span>
                      </div>
                      <StatusBadge status={r.status ?? 'Open'} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1 line-clamp-2">{r.description}</p>
                    {r.admin_notes && (
                      <p className="text-xs text-blue-400/80 mb-1 italic">Admin: {r.admin_notes}</p>
                    )}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs text-muted-foreground/60">
                        {r.profiles?.full_name ?? '—'} · {timeAgo(r.created_at)}
                        {r.pickup_id && <span> · Pickup <span className="font-mono">#{r.pickup_id}</span></span>}
                      </p>
                      <IssueActions id={r.id} status={r.status ?? 'Open'} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No issues reported</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
