import { requireAuth, ok } from '@/lib/api-auth'

export async function GET() {
  const { denied, user, supabase } = await requireAuth()
  if (denied) return denied
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)
  return ok(data ?? [])
}
