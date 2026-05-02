import { requireAuth, ok } from '@/lib/api-auth'

export async function GET() {
  const { denied, supabase } = await requireAuth('staff', 'admin')
  if (denied) return denied
  const { data } = await supabase.from('recycling_centers').select('id, name').eq('is_active', true).order('name')
  return ok(data ?? [])
}
