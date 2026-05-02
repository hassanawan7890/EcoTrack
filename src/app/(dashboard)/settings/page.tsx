'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, User, Lock, CheckCircle } from 'lucide-react'
import { cn, getRoleBadgeColor } from '@/lib/utils'

export default function SettingsPage() {
  const [profile, setProfile]       = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [fullName, setFullName]     = useState('')
  const [password, setPassword]     = useState('')
  const [confirmPw, setConfirmPw]   = useState('')

  const [profilePending, setProfilePending]   = useState(false)
  const [passwordPending, setPasswordPending] = useState(false)
  const [profileError, setProfileError]       = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess]   = useState(false)
  const [passwordError, setPasswordError]     = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    api.get('/api/profile').then((data) => {
      setProfile(data)
      setFullName(data.full_name ?? '')
    }).finally(() => setLoading(false))
  }, [])

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    setProfilePending(true)
    try {
      const data = await api.patch('/api/profile', { full_name: fullName })
      setProfile((prev: any) => ({ ...prev, ...data }))
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err: any) {
      setProfileError(err.message)
    } finally {
      setProfilePending(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    if (password !== confirmPw) { setPasswordError('Passwords do not match.'); return }
    setPasswordPending(true)
    try {
      await api.patch('/api/profile/password', { password })
      setPassword('')
      setConfirmPw('')
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordPending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Manage your account details and security." />

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 text-primary text-xl font-bold select-none">
            {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-lg">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset mt-1 capitalize', getRoleBadgeColor(profile?.role))}>
              {profile?.role}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Email and role can only be changed by an administrator.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Display Name</h2>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
          </div>
          {profileError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{profileError}</p>
          )}
          {profileSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle className="w-3.5 h-3.5" /> Name updated successfully.
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={profilePending}>
              {profilePending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Name'}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="At least 8 characters" minLength={8} required />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} type="password" placeholder="Repeat new password" required />
          </div>
          {passwordError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{passwordError}</p>
          )}
          {passwordSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle className="w-3.5 h-3.5" /> Password changed successfully.
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={passwordPending}>
              {passwordPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
