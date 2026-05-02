'use client'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Props {
  pickupChartData: any[]
  contamChartData: any[]
  roleData: any[]
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7']

const tooltipStyle = {
  backgroundColor: 'hsl(240 8% 7%)',
  border: '1px solid hsl(240 5% 14%)',
  borderRadius: '8px',
  color: 'hsl(0 0% 98%)',
  fontSize: '12px',
}

export function AdminCharts({ pickupChartData, contamChartData, roleData }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Pickups over 7 days */}
      <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold mb-4">Pickups — Last 7 Days</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pickupChartData} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 14%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
            <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
            <Bar dataKey="missed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Missed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Role distribution */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold mb-4">User Distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={roleData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
              {roleData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Contamination trend */}
      {contamChartData.length > 0 && (
        <div className="xl:col-span-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold mb-4">Contamination Rate — 30 Days</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={contamChartData}>
              <defs>
                <linearGradient id="contamGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 14%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(240 5% 55%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(240 5% 55%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="percent" stroke="#f59e0b" fill="url(#contamGrad)" strokeWidth={2} dot={false} name="Contamination %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
