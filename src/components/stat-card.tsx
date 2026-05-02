import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; label: string }
  className?: string
  iconClassName?: string
  description?: string
}

export function StatCard({ label, value, icon: Icon, trend, className, iconClassName, description }: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : null

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 card-hover', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className={cn('p-2 rounded-lg bg-primary/10', iconClassName)}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="stat-number">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-500' : 'text-red-500')}>
            {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
