import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { Truck, CheckCircle, AlertCircle, Clock, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function CitizenDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'citizen') redirect(`/${profile?.role}/dashboard`)

  const [
    { count: totalPickups },
    { count: completed },
    { count: pending },
    { count: openComplaints },
    { data: upcoming },
  ] = await Promise.all([
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('citizen_id', user.id),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('citizen_id', user.id).eq('status', 'Completed'),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('citizen_id', user.id).in('status', ['Pending', 'Scheduled']),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('citizen_id', user.id).eq('status', 'Open'),
    supabase.from('pickup_requests').select('*').eq('citizen_id', user.id).in('status', ['Pending', 'Scheduled']).order('scheduled_date').limit(5),
  ])

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(' ')[0]} 👋`}
        description="Here's an overview of your waste pickup activity."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Pickups" value={totalPickups ?? 0} icon={Truck} />
        <StatCard label="Completed" value={completed ?? 0} icon={CheckCircle}
          iconClassName="bg-emerald-500/10" className="border-emerald-500/10" />
        <StatCard label="Pending / Scheduled" value={pending ?? 0} icon={Clock}
          iconClassName="bg-amber-500/10" />
        <StatCard label="Open Complaints" value={openComplaints ?? 0} icon={AlertCircle}
          iconClassName="bg-red-500/10" />
      </div>

      {/* Upcoming pickups */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Calendar className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Upcoming Pickups</h2>
        </div>
        {upcoming && upcoming.length > 0 ? (
          <div className="divide-y divide-border">
            {upcoming.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{p.type} Pickup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{formatDate(p.scheduled_date)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Truck className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No upcoming pickups</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Request a pickup to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
