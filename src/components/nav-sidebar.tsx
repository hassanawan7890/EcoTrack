'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Truck, ClipboardList, Bell, AlertTriangle,
  Package, Beaker, BarChart3, Users, Map, Route, FileText,
  LogOut, ChevronRight, Recycle, Settings,
} from 'lucide-react'
import { cn, getInitials, getRoleBadgeColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navByRole: Record<string, NavItem[]> = {
  citizen: [
    { label: 'Dashboard', href: '/citizen/dashboard', icon: LayoutDashboard },
    { label: 'My Pickups', href: '/citizen/pickups', icon: Truck },
    { label: 'Complaints', href: '/citizen/complaints', icon: ClipboardList },
    { label: 'Notifications', href: '/citizen/notifications', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  crew: [
    { label: 'Dashboard', href: '/crew/dashboard', icon: LayoutDashboard },
    { label: "Today's Pickups", href: '/crew/pickups', icon: Truck },
    { label: 'Issue Reports', href: '/crew/issues', icon: AlertTriangle },
    { label: 'Notifications', href: '/crew/notifications', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  staff: [
    { label: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'Record Load', href: '/staff/loads', icon: Package },
    { label: 'Materials', href: '/staff/materials', icon: Recycle },
    { label: 'Contamination', href: '/staff/contamination', icon: Beaker },
    { label: 'Notifications', href: '/staff/notifications', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Zones', href: '/admin/zones', icon: Map },
    { label: 'Routes', href: '/admin/routes', icon: Route },
    { label: 'Reports', href: '/admin/reports', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
}

interface Props {
  profile: Profile
  unreadCount?: number
}

export function NavSidebar({ profile, unreadCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems = navByRole[profile.role] ?? navByRole.citizen

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Image
          src="/logo.png"
          alt="EcoTrack"
          width={140}
          height={40}
          priority
          className="h-10 w-auto"
        />
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">v2</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {profile.role}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const showBadge = item.href.endsWith('/notifications') && unreadCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'sidebar-link-active')}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {isActive && <ChevronRight className="h-3 w-3 opacity-40" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {getInitials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile.full_name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{profile.email}</p>
          </div>
        </div>
        <div className="mt-1 flex gap-1">
          <span className={cn('rounded px-2 py-0.5 text-[10px] font-medium capitalize ring-1 ring-inset', getRoleBadgeColor(profile.role))}>
            {profile.role}
          </span>
          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
