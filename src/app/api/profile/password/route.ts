import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str } from '@/lib/api-auth'

export async function PATCH(req: NextRequest) {
  const { denied, supabase } = await requireAuth()
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const password = str(body.password, 128)
  const confirm  = str(body.confirm_password, 128)
  if (password.length < 8) return fail('Password must be at least 8 characters')
  if (password !== confirm) return fail('Passwords do not match')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return fail(error.message)
  return ok({ success: true })
}
