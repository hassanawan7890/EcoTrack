import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy | h:mm a')
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getRoleBadgeColor(role: string) {
  const map: Record<string, string> = {
    admin: 'bg-purple-500/15 text-purple-400 ring-purple-500/20',
    crew: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
    staff: 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
    citizen: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  }
  return map[role] ?? 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20'
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    Completed: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
    Pending: 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
    Scheduled: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
    Missed: 'bg-red-500/15 text-red-400 ring-red-500/20',
    Cancelled: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20',
    Open: 'bg-red-500/15 text-red-400 ring-red-500/20',
    'In Progress': 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
    Resolved: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
    Reviewed: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
    Closed: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
    Active: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
    Inactive: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20',
  }
  return map[status] ?? 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20'
}

export function getRoleDashboard(role: string) {
  const map: Record<string, string> = {
    admin: '/admin/dashboard',
    crew: '/crew/dashboard',
    staff: '/staff/dashboard',
    citizen: '/citizen/dashboard',
  }
  return map[role] ?? '/citizen/dashboard'
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
