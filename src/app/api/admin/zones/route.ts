import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied
  const { data } = await supabase.from('zones').select('*').order('name')
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const { denied, supabase } = await requireAuth('admin')
  if (denied) return denied
  const body        = await req.json().catch(() => ({}))
  const name        = str(body.name, 100)
  const description = str(body.description, 500)
  const coordinates = body.coordinates ?? null

  if (!name) return fail('Zone name is required')
  if (coordinates !== null && (!Array.isArray(coordinates) || coordinates.length < 3)) return fail('At least 3 boundary points required')

  const { error } = await supabase.from('zones').insert({ name, description: description || null, coordinates })
  if (error) return fail(error.message)
  revalidatePath('/admin/zones')
  revalidatePath('/admin/routes')
  return ok({ success: true }, 201)
}
