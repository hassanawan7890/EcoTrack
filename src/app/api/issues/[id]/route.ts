import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

const VALID_STATUSES = ['Reviewed', 'Closed']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied

  const { id: rawId } = await params
  const id = int(rawId)
  if (!id || id <= 0) return fail('Invalid ID', 400)

  const body       = await req.json().catch(() => ({}))
  const status     = str(body.status)
  const admin_notes = str(body.admin_notes, 2000)

  if (!VALID_STATUSES.includes(status)) return fail('Invalid status')

  const { data: issue } = await supabase.from('issue_reports').select('crew_id, type').eq('id', id).single()
  if (!issue) return fail('Not found', 404)

  const { error } = await supabase.from('issue_reports').update({ status, admin_notes: admin_notes || null }).eq('id', id)
  if (error) return fail(error.message)

  if (admin_notes) {
    await supabase.from('notifications').insert({
      user_id: issue.crew_id,
      title: `Issue ${status}`,
      message: admin_notes,
      is_read: false,
    })
  }
  revalidatePath('/admin/reports')
  return ok({ success: true })
}
