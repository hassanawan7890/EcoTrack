import { requireAuth, ok } from '@/lib/api-auth'

export async function POST() {
  const { denied, supabase } = await requireAuth()
  if (denied) return denied
  await supabase.auth.signOut()
  return ok({ success: true })
}
