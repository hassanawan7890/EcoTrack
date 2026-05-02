import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { Truck, CheckCircle, Clock, XCircle, MapPin, Route } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Crew Dashboard' }

export default async function CrewDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'crew') redirect(`/${profile?.role}/dashboard`)

  const today = new Date().toISOString().split('T')[0]
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayDayName = dayNames[new Date().getDay()]

  const [
    { data: myRoutes },
    { data: todayPickups },
    { count: totalToday },
    { count: completedToday },
    { count: pendingToday },
    { count: missedToday },
  ] = await Promise.all([
    supabase.from('routes').select('id, name, schedule_day, zones(name)').eq('crew_id', user.id).eq('is_active', true).order('schedule_day'),
    supabase.from('pickup_requests').select('*, profiles!citizen_id(full_name)')
      .eq('scheduled_date', today).in('status', ['Pending', 'Scheduled']).order('created_at').limit(10),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('scheduled_date', today).eq('status', 'Completed'),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('scheduled_date', today).in('status', ['Pending', 'Scheduled']),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('scheduled_date', today).eq('status', 'Missed'),
  ])

  const todayRoutes = myRoutes?.filter((r: any) => r.schedule_day === todayDayName) ?? []

  return (
    <div>
      <PageHeader
        title={`Good day, ${profile?.full_name?.split(' ')[0]}`}
        description={`${todayDayName}, ${formatDate(new Date())} — here's your route summary.`}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Pickups" value={totalToday ?? 0} icon={Truck} />
        <StatCard label="Completed" value={completedToday ?? 0} icon={CheckCircle} iconClassName="bg-emerald-500/10" />
        <StatCard label="Pending" value={pendingToday ?? 0} icon={Clock} iconClassName="bg-amber-500/10" />
        <StatCard label="Missed" value={missedToday ?? 0} icon={XCircle} iconClassName="bg-red-500/10" />
      </div>

      {/* My Routes */}
      {myRoutes && myRoutes.length > 0 && (
        <div className="rounded-xl border border-border bg-card mb-6">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Route className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">My Assigned Routes</h2>
          </div>
          <div className="divide-y divide-border">
            {myRoutes.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{(r.zones as any)?.name ?? '—'}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${r.schedule_day === todayDayName ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {r.schedule_day}{r.schedule_day === todayDayName ? ' · Today' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's pickup queue */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Today's Pickup Queue</h2>
          {todayRoutes.length === 0 && (
            <span className="ml-auto text-xs text-muted-foreground">No route scheduled for today</span>
          )}
        </div>
        {todayPickups && todayPickups.length > 0 ? (
          <div className="divide-y divide-border">
            {todayPickups.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.type} Pickup</p>
                    <p className="text-xs text-muted-foreground">{p.address}</p>
                    {p.profiles?.full_name && (
                      <p className="text-xs text-muted-foreground/60">{p.profiles.full_name}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Truck className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No pickups scheduled for today</p>
          </div>
        )}
      </div>
    </div>
  )
}
