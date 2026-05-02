import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { AdminCharts } from '../dashboard/charts'
import { BarChart3, Recycle, Scale, TrendingDown } from 'lucide-react'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role}/dashboard`)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    { data: loadData },
    { data: materialData },
    { data: contamData },
    { data: pickupsByDay },
    { data: roleDistribution },
  ] = await Promise.all([
    supabase.from('load_data').select('net_weight, load_date').gte('load_date', thirtyDaysAgo),
    supabase.from('load_materials').select('weight_kg, material_categories(name)'),
    supabase.from('contamination_reports').select('percent, created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
    supabase.from('pickup_requests').select('status, scheduled_date').gte('scheduled_date', sevenDaysAgo).order('scheduled_date'),
    supabase.from('profiles').select('role'),
  ])

  const totalWeight = (loadData ?? []).reduce((s: number, l: any) => s + l.net_weight, 0)
  const avgContam = contamData && contamData.length > 0
    ? (contamData.reduce((s: number, r: any) => s + r.percent, 0) / contamData.length).toFixed(1)
    : '0.0'

  const matByType: Record<string, number> = {}
  ;(materialData ?? []).forEach((m: any) => {
    const name = m.material_categories?.name ?? 'Unknown'
    matByType[name] = (matByType[name] ?? 0) + m.weight_kg
  })

  const materialChartData = Object.entries(matByType).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))

  const contamChartData = (contamData ?? []).map((r: any) => ({
    date: r.created_at.split('T')[0],
    percent: Number(r.percent.toFixed(1)),
  }))

  const pickupChartData = buildPickupChart(pickupsByDay ?? [])

  const roleData = (() => {
    const counts: Record<string, number> = {}
    ;(roleDistribution ?? []).forEach((p: any) => { counts[p.role] = (counts[p.role] ?? 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
  })()

  return (
    <div>
      <PageHeader title="Analytics" description="Deep-dive into recycling and collection metrics." />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Loads (30d)" value={(loadData ?? []).length} icon={BarChart3} />
        <StatCard label="Net Weight (30d)" value={`${totalWeight.toFixed(0)} kg`} icon={Scale} />
        <StatCard label="Materials Logged" value={Object.values(matByType).reduce((s, v) => s + v, 0).toFixed(0) + ' kg'} icon={Recycle} />
        <StatCard label="Avg Contamination" value={`${avgContam}%`} icon={TrendingDown} iconClassName="bg-amber-500/10" />
      </div>

      <AdminCharts pickupChartData={pickupChartData} contamChartData={contamChartData} roleData={roleData} />

      {materialChartData.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold mb-1">Material Breakdown by Type</p>
          <p className="text-xs text-muted-foreground mb-4">Total weight (kg) per material category</p>
          <div className="space-y-3">
            {materialChartData.sort((a, b) => b.value - a.value).map((m) => {
              const max = Math.max(...materialChartData.map((x) => x.value))
              const pct = max ? (m.value / max) * 100 : 0
              return (
                <div key={m.name} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-muted-foreground text-xs">{m.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs font-medium">{m.value} kg</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
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
