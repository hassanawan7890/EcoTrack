import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str, int } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied

  const { id: rawId } = await params
  const id = int(rawId)
  if (!id || id <= 0) return fail('Invalid ID', 400)

  const body        = await req.json().catch(() => ({}))
  const name        = str(body.name, 100)
  const description = str(body.description, 500)
  const coordinates = body.coordinates ?? undefined

  if (!name) return fail('Zone name is required')

  const updates: Record<string, unknown> = { name, description: description || null }
  if (coordinates !== undefined) {
    if (!Array.isArray(coordinates) || coordinates.length < 3) return fail('At least 3 boundary points required')
    updates.coordinates = coordinates
  }

  const { error } = await supabase.from('zones').update(updates).eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/admin/zones')
  return ok({ success: true })
}
