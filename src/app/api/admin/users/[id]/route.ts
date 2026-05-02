import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_ROLES = ['admin', 'citizen', 'crew', 'staff']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAuth('admin')
  if (denied) return denied

  const { id } = await params
  if (!id?.trim()) return fail('Invalid user ID', 400)

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  if ('role' in body) {
    const role = str(body.role)
    if (!VALID_ROLES.includes(role)) return fail('Invalid role')
    const { error } = await admin.from('profiles').update({ role }).eq('id', id)
    if (error) return fail(error.message)
  } else if ('is_active' in body) {
    const is_active = Boolean(body.is_active)
    const { error } = await admin.from('profiles').update({ is_active }).eq('id', id)
    if (error) return fail(error.message)
  } else {
    return fail('Nothing to update')
  }

  revalidatePath('/admin/users')
  return ok({ success: true })
}
