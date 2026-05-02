import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, int } from '@/lib/api-auth'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, user, supabase } = await requireAuth()
  if (denied) return denied
  const { id: rawId } = await params
  const id = int(rawId)
  if (!id || id <= 0) return fail('Invalid ID', 400)
  await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user!.id)
  return ok({ success: true })
}
