import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const { denied, user, supabase } = await requireAuth('citizen')
  if (denied) return denied
  const { data } = await supabase
    .from('complaints')
    .select('*, pickup_requests(id, type, address, scheduled_date, status)')
    .eq('citizen_id', user!.id)
    .order('created_at', { ascending: false })
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, user, supabase } = await requireAuth('citizen')
  if (denied) return denied
  const body      = await req.json().catch(() => ({}))
  const subject   = str(body.subject, 200)
  const description = str(body.description, 2000)
  const pickupId  = body.pickup_id ? int(body.pickup_id) : null

  if (!subject)     return fail('Subject is required')
  if (!description) return fail('Description is required')
  if (pickupId !== null && (!Number.isFinite(pickupId) || pickupId <= 0)) return fail('Invalid pickup ID')

  const { error } = await supabase.from('complaints').insert({
    citizen_id: user!.id, subject, description, pickup_id: pickupId || null,
  })
  if (error) return fail(error.message)
  revalidatePath('/citizen/complaints')
  return ok({ success: true }, 201)
}
