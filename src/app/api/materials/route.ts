import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const { denied, user, supabase } = await requireAuth('staff')
  if (denied) return denied
  const { data: myLoads } = await supabase.from('load_data').select('id').eq('staff_id', user!.id)
  const ids = myLoads?.map((l: any) => l.id) ?? []
  if (ids.length === 0) return ok([])
  const { data } = await supabase
    .from('load_materials')
    .select('*, material_categories(name), load_data(load_date)')
    .in('load_id', ids)
    .order('id', { ascending: false })
    .limit(50)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, user, supabase } = await requireAuth('staff')
  if (denied) return denied
  const body   = await req.json().catch(() => ({}))
  const loadId = int(body.load_id)
  if (!loadId || loadId <= 0) return fail('Invalid load ID')

  // Verify this load belongs to the caller
  const { data: load } = await supabase.from('load_data').select('staff_id').eq('id', loadId).single()
  if (!load || load.staff_id !== user!.id) return fail('Load not found', 404)

  const mats = Array.isArray(body.materials) ? body.materials : []
  const rows = mats
    .filter((m: any) => Number.isFinite(Number(m.weight_kg)) && Number(m.weight_kg) > 0 && Number.isInteger(Number(m.material_id)) && Number(m.material_id) > 0)
    .map((m: any) => ({ load_id: loadId, material_id: Number(m.material_id), weight_kg: Number(m.weight_kg) }))

  if (rows.length === 0) return fail('No valid material entries provided')
  const { error } = await supabase.from('load_materials').insert(rows)
  if (error) return fail(error.message)
  revalidatePath('/staff/materials')
  return ok({ success: true }, 201)
}
