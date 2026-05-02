import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/stat-card'
import { PageHeader } from '@/components/page-header'
import { Package, Scale, AlertTriangle, Activity } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export const metadata: Metadata = { title: 'Staff Dashboard' }

export default async function StaffDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'staff') redirect(`/${profile?.role}/dashboard`)

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: todayLoads },
    { data: recentLoads },
    { data: avgContamination },
  ] = await Promise.all([
    supabase.from('load_data').select('*', { count: 'exact', head: true }).eq('load_date', today).eq('staff_id', user.id),
    supabase.from('load_data').select('*, recycling_centers(name)').eq('staff_id', user.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('contamination_reports').select('percent').eq('staff_id', user.id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  const avgPct = avgContamination && avgContamination.length > 0
    ? (avgContamination.reduce((s: number, r: any) => s + r.percent, 0) / avgContamination.length).toFixed(1)
    : '0.0'

  const totalNetWeight = recentLoads?.reduce((s, l: any) => s + l.net_weight, 0) ?? 0

  return (
    <div>
      <PageHeader
        title={`Hello, ${profile?.full_name?.split(' ')[0]}`}
        description="Recycling center operations overview."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Loads" value={todayLoads ?? 0} icon={Package} />
        <StatCard label="Net Weight (recent)" value={`${totalNetWeight.toFixed(1)} kg`} icon={Scale} />
        <StatCard label="Avg Contamination (30d)" value={`${avgPct}%`} icon={AlertTriangle} iconClassName="bg-amber-500/10" />
        <StatCard label="Total Records" value={recentLoads?.length ?? 0} icon={Activity} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Recent Load Records</h2>
        </div>
        {recentLoads && recentLoads.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Center</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross (kg)</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tare (kg)</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Net (kg)</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentLoads.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 font-medium">{l.recycling_centers?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{l.gross_weight}</td>
                  <td className="px-5 py-4 text-muted-foreground">{l.tare_weight}</td>
                  <td className="px-5 py-4 font-medium text-primary">{l.net_weight}</td>
                  <td className="px-5 py-4 text-muted-foreground">{timeAgo(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No loads recorded yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
