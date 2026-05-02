import { NextRequest } from 'next/server'
import { requireAuth, ok, fail, str } from '@/lib/api-auth'

export async function GET() {
  const { denied, user, supabase } = await requireAuth()
  if (denied) return denied
  const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  return ok(data)
}

export async function PATCH(req: NextRequest) {
  const { denied, user, supabase } = await requireAuth()
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const full_name = str(body.full_name, 200)
  if (!full_name) return fail('Name is required')
  const { error } = await supabase.from('profiles').update({ full_name }).eq('id', user!.id)
  if (error) return fail(error.message)
  return ok({ success: true })
}
