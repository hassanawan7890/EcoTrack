import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

const VALID_TYPES = ['Access Blocked', 'Container Full', 'Wrong Address', 'Hazardous Material', 'Other']

export async function GET() {
  const { denied, user, profile, supabase } = await requireAuth('crew', 'admin')
  if (denied) return denied

  const query = supabase.from('issue_reports').select('*, profiles!crew_id(full_name)').order('created_at', { ascending: false })
  const { data } = profile!.role === 'crew'
    ? await query.eq('crew_id', user!.id)
    : await query
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, user, supabase } = await requireAuth('crew')
  if (denied) return denied
  const body      = await req.json().catch(() => ({}))
  const type      = str(body.type)
  const description = str(body.description, 2000)
  const pickupId  = body.pickup_id ? int(body.pickup_id) : null
  const photoUrl  = str(body.photo_url, 500)

  if (!VALID_TYPES.includes(type)) return fail('Invalid issue type')
  if (!description)                return fail('Description is required')
  if (pickupId !== null && (!Number.isFinite(pickupId) || pickupId <= 0)) return fail('Invalid pickup ID')
  if (photoUrl && !photoUrl.startsWith('https://')) return fail('Photo URL must be HTTPS')

  const { error } = await supabase.from('issue_reports').insert({
    crew_id: user!.id, type, description, pickup_id: pickupId || null, photo_url: photoUrl || null,
  })
  if (error) return fail(error.message)
  revalidatePath('/crew/issues')
  return ok({ success: true }, 201)
}
