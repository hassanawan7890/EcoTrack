import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { AdminCharts } from './charts'
import { Users, Truck, AlertCircle, TrendingUp, Activity, CheckCircle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role}/dashboard`)

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: totalPickups },
    { count: completedPickups },
    { count: openComplaints },
    { data: recentActivity },
    { data: contamData },
    { data: pickupsByDay },
    { data: roleDistribution },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
    supabase.from('pickup_requests').select('id, status, type, created_at, address').order('created_at', { ascending: false }).limit(5),
    supabase.from('contamination_reports').select('percent, created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
    supabase.from('pickup_requests').select('status, scheduled_date').gte('scheduled_date', sevenDaysAgo).order('scheduled_date'),
    supabase.from('profiles').select('role'),
  ])

  const avgContamination = contamData && contamData.length > 0
    ? (contamData.reduce((s, r) => s + r.percent, 0) / contamData.length).toFixed(1)
    : '0.0'

  const completionRate = totalPickups ? ((completedPickups ?? 0) / totalPickups * 100).toFixed(0) : '0'

  // Prepare chart data
  const pickupChartData = buildPickupChart(pickupsByDay ?? [])
  const contamChartData = (contamData ?? []).map((r: any) => ({
    date: r.created_at.split('T')[0],
    percent: Number(r.percent.toFixed(1)),
  }))

  const roleData = (() => {
    const counts: Record<string, number> = {}
    ;(roleDistribution ?? []).forEach((p: any) => { counts[p.role] = (counts[p.role] ?? 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
  })()

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="System-wide analytics and operations overview." />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={totalUsers ?? 0} icon={Users} />
        <StatCard label="Active Users" value={activeUsers ?? 0} icon={Activity} iconClassName="bg-emerald-500/10" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} icon={CheckCircle} iconClassName="bg-blue-500/10" />
        <StatCard label="Open Complaints" value={openComplaints ?? 0} icon={AlertCircle} iconClassName="bg-red-500/10" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <StatCard label="Total Pickups" value={totalPickups ?? 0} icon={Truck} description={`${completedPickups ?? 0} completed`} />
        <StatCard label="Avg Contamination (30d)" value={`${avgContamination}%`} icon={TrendingUp} iconClassName="bg-amber-500/10" />
      </div>

      <AdminCharts
        pickupChartData={pickupChartData}
        contamChartData={contamChartData}
        roleData={roleData}
      />

      {/* Recent activity */}
      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Recent Pickup Activity</h2>
        </div>
        {recentActivity && recentActivity.length > 0 ? (
          <div className="divide-y divide-border">
            {recentActivity.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20">
                <div>
                  <p className="text-sm font-medium">{p.type} Pickup — {p.address}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(p.created_at)}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground px-6 py-8 text-center">No recent activity</p>
        )}
      </div>
    </div>
  )
}

function buildPickupChart(pickups: any[]) {
  const days: Record<string, { completed: number; pending: number; missed: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    days[d] = { completed: 0, pending: 0, missed: 0 }
  }
  pickups.forEach((p) => {
    const d = p.scheduled_date
    if (days[d]) {
      if (p.status === 'Completed') days[d].completed++
      else if (p.status === 'Missed') days[d].missed++
      else days[d].pending++
    }
  })
  return Object.entries(days).map(([date, val]) => ({
    date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
    ...val,
  }))
}
