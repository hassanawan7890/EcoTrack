import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ok, fail, str } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const full_name = str(body.full_name, 200)
  const email     = str(body.email, 254)
  const password  = str(body.password, 128)
  const confirm   = str(body.confirm_password, 128)

  if (!full_name)                  return fail('Full name is required')
  if (!email || !email.includes('@')) return fail('Invalid email address')
  if (password.length < 8)         return fail('Password must be at least 8 characters')
  if (password !== confirm)        return fail('Passwords do not match')

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role: 'citizen' },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already') || msg.includes('duplicate')) return fail('An account with this email already exists.', 409)
    return fail(error.message)
  }

  if (!data.user) return fail('Unable to create user account')

  const { error: pe } = await admin.from('profiles').upsert(
    { id: data.user.id, email, full_name, role: 'citizen', is_active: true },
    { onConflict: 'id' },
  )
  if (pe) return fail(pe.message)

  return ok({ success: true }, 201)
}
