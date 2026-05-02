import { requireAuth, ok } from '@/lib/api-auth'

export async function GET() {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied
  const { data } = await supabase.from('zones').select('id, name, coordinates').order('name')
  return ok(data ?? [])
}
