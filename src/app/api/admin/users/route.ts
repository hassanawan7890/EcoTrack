import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_ROLES = ['admin', 'citizen', 'crew', 'staff']

export async function GET() {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied } = await requireAuth('admin')
  if (denied) return denied
  const body      = await req.json().catch(() => ({}))
  const full_name = str(body.full_name, 200)
  const email     = str(body.email, 254)
  const password  = str(body.password, 128)
  const role      = str(body.role)

  if (!full_name)                   return fail('Full name is required')
  if (!email || !email.includes('@')) return fail('Invalid email')
  if (password.length < 8)          return fail('Password must be at least 8 characters')
  if (!VALID_ROLES.includes(role))  return fail('Invalid role')

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name, role },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    return fail(msg.includes('already') ? 'Email already registered' : error.message, msg.includes('already') ? 409 : 400)
  }
  if (!data.user) return fail('Unable to create user account')

  const { error: pe } = await admin.from('profiles').upsert(
    { id: data.user.id, email, full_name, role, is_active: true },
    { onConflict: 'id' },
  )
  if (pe) return fail(pe.message)
  revalidatePath('/admin/users')
  return ok({ success: true }, 201)
}
