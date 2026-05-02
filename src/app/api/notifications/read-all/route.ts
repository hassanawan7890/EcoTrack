import { requireAuth, ok } from '@/lib/api-auth'

export async function POST() {
  const { denied, user, supabase } = await requireAuth()
  if (denied) return denied
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false)
  return ok({ success: true })
}
