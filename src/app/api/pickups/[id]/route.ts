import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

const VALID_STATUSES = ['Pending', 'Scheduled', 'Completed', 'Missed', 'Cancelled']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, user, profile, supabase } = await requireAuth('citizen', 'crew', 'admin')
  if (denied) return denied

  const { id: rawId } = await params
  const id = int(rawId)
  if (!id || id <= 0) return fail('Invalid pickup ID', 400)

  const body = await req.json().catch(() => ({}))

  // Citizen can only cancel their own
  if (profile!.role === 'citizen') {
    const { data: pickup } = await supabase.from('pickup_requests').select('citizen_id, status').eq('id', id).single()
    if (!pickup) return fail('Not found', 404)
    if (pickup.citizen_id !== user!.id) return fail('Forbidden', 403)
    if (pickup.status === 'Completed') return fail('Cannot cancel a completed pickup')
    const { error } = await supabase.from('pickup_requests').update({ status: 'Cancelled' }).eq('id', id)
    if (error) return fail(error.message)
    revalidatePath('/citizen/pickups')
    return ok({ success: true })
  }

  // Crew / admin can update status
  const status = str(body.status)
  const notes  = str(body.notes, 1000)
  if (!VALID_STATUSES.includes(status)) return fail('Invalid status')

  const updates: Record<string, unknown> = { status }
  if (notes) updates.notes = notes

  const { error } = await supabase.from('pickup_requests').update(updates).eq('id', id)
  if (error) return fail(error.message)

  // notify citizen on completion
  if (status === 'Completed' || status === 'Missed') {
    const { data: pickup } = await supabase.from('pickup_requests').select('citizen_id, type').eq('id', id).single()
    if (pickup) {
      await supabase.from('notifications').insert({
        user_id: pickup.citizen_id,
        title: `Pickup ${status}`,
        message: `Your ${pickup.type} pickup has been marked ${status}.`,
        is_read: false,
      })
    }
  }
  revalidatePath('/crew/pickups')
  return ok({ success: true })
}
