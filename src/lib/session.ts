import { createClient } from './supabase/client'

export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session) { window.location.href = '/auth/login'; return null }
  const supabase = createClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') { window.location.href = '/auth/login'; return null }
  return { session, profile }
}
