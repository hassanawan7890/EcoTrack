import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied

  const { id: rawId } = await params
  const id = int(rawId)
  if (!id || id <= 0) return fail('Invalid ID', 400)

  const body   = await req.json().catch(() => ({}))
  const action = str(body.action)
  const notes  = str(body.resolution_notes, 2000)

  const { data: complaint } = await supabase
    .from('complaints')
    .select('citizen_id, subject, status')
    .eq('id', id)
    .single()
  if (!complaint) return fail('Not found', 404)

  if (action === 'in-progress') {
    const { error } = await supabase
      .from('complaints')
      .update({ status: 'In Progress', resolved_at: null })
      .eq('id', id)
    if (error) return fail(error.message)
    await supabase.from('notifications').insert({
      user_id: complaint.citizen_id,
      title: 'Complaint Update',
      message: `Your complaint "${complaint.subject}" is now being reviewed.`,
      is_read: false,
    })
  } else if (action === 'resolve') {
    const { error } = await supabase.from('complaints').update({
      status: 'Resolved',
      resolution_notes: notes || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) return fail(error.message)
    if (notes) {
      await supabase.from('notifications').insert({
        user_id: complaint.citizen_id,
        title: 'Complaint Resolved',
        message: notes,
        is_read: false,
      })
    }
  } else {
    return fail('Invalid action')
  }

  revalidatePath('/admin/reports')
  revalidatePath('/citizen/complaints')
  return ok({ success: true })
}
