import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, num, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const { denied, user, supabase } = await requireAuth('staff')
  if (denied) return denied
  const { data } = await supabase
    .from('contamination_reports')
    .select('*, load_data(load_date)')
    .eq('staff_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(30)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, user, supabase } = await requireAuth('staff')
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const loadId = int(body.load_id)
  const percent = num(body.percent)
  const type = str(body.type, 200)
  const notes = str(body.notes, 1000)
  const photoUrl = str(body.photo_url, 500)

  if (!loadId || loadId <= 0) return fail('Invalid load ID')
  if (isNaN(percent) || percent < 0 || percent > 100) return fail('Percent must be between 0 and 100')
  if (!type) return fail('Contamination type is required')
  if (photoUrl && !photoUrl.startsWith('https://')) return fail('Photo URL must be HTTPS')

  const { data: load } = await supabase.from('load_data').select('staff_id').eq('id', loadId).single()
  if (!load || load.staff_id !== user!.id) return fail('Load not found', 404)

  const { error } = await supabase.from('contamination_reports').insert({
    load_id: loadId,
    staff_id: user!.id,
    percent,
    type,
    notes: notes || null,
    photo_url: photoUrl || null,
  })
  if (error) return fail(error.message)
  revalidatePath('/staff/contamination')
  return ok({ success: true }, 201)
}
