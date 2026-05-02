import { requireAuth, ok } from '@/lib/api-auth'

export async function GET() {
  const { denied, supabase } = await requireAuth('staff')
  if (denied) return denied
  const { data } = await supabase.from('material_categories').select('*').order('name')
  return ok(data ?? [])
}
