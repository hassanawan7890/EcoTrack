'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading]             = useState(true)

  async function load() {
    try {
      const data = await api.get('/api/notifications')
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleMarkRead(id: number) {
    await api.patch(`/api/notifications/${id}`)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  async function handleMarkAllRead() {
    await api.post('/api/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div>
      <PageHeader title="Notifications" description={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" size="sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </PageHeader>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BellOff className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n: any) => (
              <div key={n.id} className={cn('flex items-start gap-4 px-6 py-4 transition-colors', !n.is_read ? 'bg-primary/5' : 'hover:bg-muted/20')}>
                <div className={cn('mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', n.is_read ? 'bg-muted' : 'bg-primary/15')}>
                  <Bell className={cn('w-4 h-4', n.is_read ? 'text-muted-foreground' : 'text-primary')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', n.is_read && 'text-muted-foreground')}>{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => handleMarkRead(n.id)} className="flex-shrink-0 text-xs text-primary hover:underline">
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
