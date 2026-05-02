'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { getRoleDashboard } from '@/lib/utils'

const INPUT_CLASS = `w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40
                     focus:border-primary transition-all`

const demoAccounts = [
  { label: 'Admin', email: 'admin@ecotrack.com', password: 'demo1234', color: 'text-purple-400' },
  { label: 'Citizen', email: 'citizen@ecotrack.com', password: 'demo1234', color: 'text-emerald-400' },
  { label: 'Crew', email: 'crew@ecotrack.com', password: 'demo1234', color: 'text-blue-400' },
  { label: 'Staff', email: 'staff@ecotrack.com', password: 'demo1234', color: 'text-amber-400' },
]

function getRouteErrorMessage(error: string | null) {
  switch (error) {
    case 'suspended':
      return 'Your account has been suspended. Please contact an administrator.'
    case 'auth_failed':
      return 'Authentication failed. Please try signing in again.'
    default:
      return null
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)
  const [regSuccess, setRegSuccess] = useState(false)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  useEffect(() => {
    if (tab !== 'login') return

    const params = new URLSearchParams(window.location.search)
    setRouteError(getRouteErrorMessage(params.get('error')))
  }, [tab])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setLoginError('Invalid email or password.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      router.push(getRoleDashboard(profile?.role ?? 'citizen'))
      router.refresh()
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegLoading(true)
    setRegError(null)
    setRegSuccess(false)

    try {
      await api.post('/api/auth/register', {
        full_name: regName,
        email: regEmail,
        password: regPassword,
        confirm_password: regConfirm,
      })
      setRegSuccess(true)
      setRegName('')
      setRegEmail('')
      setRegPassword('')
      setRegConfirm('')
    } catch (error) {
      setRegError(getErrorMessage(error))
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="EcoTrack"
            width={240}
            height={96}
            priority
            className="h-20 w-auto"
          />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Municipal waste and recycling management
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/20">
        <div className="mb-6 flex rounded-lg bg-muted/50 p-1">
          {(['login', 'register'] as const).map((nextTab) => (
            <button
              key={nextTab}
              type="button"
              onClick={() => {
                setTab(nextTab)
                setLoginError(null)
                setRegError(null)
                setRegSuccess(false)
              }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                tab === nextTab ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {nextTab === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ecotrack.com"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${INPUT_CLASS} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((current) => !current)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
                {loginError}
              </div>
            )}

            {!loginError && routeError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
                {routeError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-center text-xs text-muted-foreground">Quick access demo accounts</p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.label}
                    type="button"
                    onClick={() => {
                      setEmail(account.email)
                      setPassword(account.password)
                    }}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-xs transition-all hover:bg-accent"
                  >
                    <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-60" />
                    <span className={`font-medium ${account.color}`}>{account.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="-mt-2 mb-1 text-xs text-muted-foreground">
              New accounts are registered as <span className="font-medium text-emerald-400">Citizen</span>.
              Contact an admin to change your role.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reg-name">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reg-email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reg-pw">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-pw"
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reg-confirm">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-confirm"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Repeat your password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {regError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
                {regError}
              </div>
            )}

            {regSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                Account created. You can now{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => {
                    setTab('login')
                    setRegSuccess(false)
                  }}
                >
                  sign in
                </button>
                .
              </div>
            )}

            <button
              type="submit"
              disabled={regLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">EcoTrack v2.0 | Built for municipalities</p>
    </div>
  )
}
