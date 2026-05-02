import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, num, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const { denied, user, supabase } = await requireAuth('staff')
  if (denied) return denied
  const { data } = await supabase
    .from('load_data')
    .select('*, recycling_centers(name)')
    .eq('staff_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(30)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, user, supabase } = await requireAuth('staff')
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const grossWeight = num(body.gross_weight)
  const tareWeight  = num(body.tare_weight)
  const centerId    = int(body.center_id)
  const crewId      = body.crew_id ? String(body.crew_id) : null

  if (isNaN(grossWeight) || grossWeight <= 0)  return fail('Invalid gross weight')
  if (isNaN(tareWeight)  || tareWeight < 0)    return fail('Invalid tare weight')
  if (tareWeight >= grossWeight)               return fail('Tare weight must be less than gross weight')
  if (!centerId || centerId <= 0)              return fail('Invalid center')

  const { error } = await supabase.from('load_data').insert({
    staff_id: user!.id, center_id: centerId, crew_id: crewId,
    gross_weight: grossWeight, tare_weight: tareWeight,
    load_date: new Date().toISOString().split('T')[0],
  })
  if (error) return fail(error.message)
  revalidatePath('/staff/loads')
  return ok({ success: true }, 201)
}
