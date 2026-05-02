import { requireAuth, ok } from '@/lib/api-auth'

export async function GET() {
  const { denied, supabase } = await requireAuth('admin', 'staff')
  if (denied) return denied
  const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'crew').eq('is_active', true).order('full_name')
  return ok(data ?? [])
}
