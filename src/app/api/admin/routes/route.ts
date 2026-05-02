import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function GET() {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied
  const { data } = await supabase
    .from('routes')
    .select('*, zones(name), profiles!crew_id(full_name)')
    .order('name')
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied
  const body            = await req.json().catch(() => ({}))
  const name            = str(body.name, 200)
  const zoneId          = int(body.zone_id)
  const crewId          = body.crew_id ? str(body.crew_id) : null
  const scheduleDay     = str(body.schedule_day)
  const pathCoordinates = body.path_coordinates ?? null

  if (!name)                        return fail('Route name is required')
  if (!zoneId || zoneId <= 0)       return fail('Invalid zone')
  if (!VALID_DAYS.includes(scheduleDay)) return fail('Invalid schedule day')
  if (pathCoordinates !== null && (!Array.isArray(pathCoordinates) || pathCoordinates.length < 2)) return fail('At least 2 waypoints required')

  const row: Record<string, unknown> = {
    name, zone_id: zoneId, crew_id: crewId || null, schedule_day: scheduleDay, is_active: true,
  }
  if (pathCoordinates !== null) row.path_coordinates = pathCoordinates

  const { error } = await supabase.from('routes').insert(row)
  if (error) return fail(error.message)
  revalidatePath('/admin/routes')
  return ok({ success: true }, 201)
}
