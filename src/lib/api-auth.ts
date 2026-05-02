import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAuth(...roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, profile: null, supabase }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) {
    return { denied: NextResponse.json({ error: 'Account suspended' }, { status: 403 }), user: null, profile: null, supabase }
  }
  if (roles.length > 0 && !roles.includes(profile.role)) {
    return { denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null, profile: null, supabase }
  }
  return { denied: null, user, profile, supabase }
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status })
export const fail = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

// Input helpers keep values safe before touching the DB.
export const str = (v: unknown, max = 1000) => String(v ?? '').trim().slice(0, max)
export const num = (v: unknown) => Number(v)
export const int = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : NaN
}
