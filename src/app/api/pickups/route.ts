import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

const VALID_TYPES    = ['Regular', 'Bulk', 'Special']
const VALID_STATUSES = ['Pending', 'Scheduled', 'Completed', 'Missed', 'Cancelled']

export async function GET() {
  const { denied, user, profile, supabase } = await requireAuth('citizen', 'crew', 'admin')
  if (denied) return denied

  if (profile!.role === 'citizen') {
    const { data } = await supabase.from('pickup_requests').select('*').eq('citizen_id', user!.id).order('created_at', { ascending: false })
    return ok(data ?? [])
  }

  // crew / admin see all
  const { data } = await supabase
    .from('pickup_requests')
    .select('*, profiles!citizen_id(full_name, email)')
    .in('status', VALID_STATUSES)
    .order('scheduled_date', { ascending: false })
    .limit(100)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, user, supabase } = await requireAuth('citizen')
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const type           = str(body.type)
  const address        = str(body.address, 500)
  const scheduled_date = str(body.scheduled_date, 20)
  const notes          = str(body.notes ?? body.note, 1000)

  if (!VALID_TYPES.includes(type)) return fail('Invalid pickup type')
  if (!address)                    return fail('Address is required')
  if (!scheduled_date)             return fail('Scheduled date is required')

  const { error } = await supabase.from('pickup_requests').insert({
    citizen_id: user!.id, type, address, scheduled_date, notes: notes || null,
  })
  if (error) return fail(error.message)
  revalidatePath('/citizen/pickups')
  return ok({ success: true }, 201)
}
