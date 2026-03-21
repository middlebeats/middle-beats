import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/Layout'
import StatementsClient from './client'

export default async function AdminStatementsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role,email').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/artist/dashboard')

  const { data: artists } = await supabase.from('artists').select('id, name, email').eq('is_active', true)
  const { data: statements } = await supabase
    .from('royalty_statements').select('*, artists(name,email)')
    .order('created_at', { ascending: false })

  // Get available periods
  const { data: periods } = await supabase
    .from('royalty_records').select('period').order('period', { ascending: false })
  const uniquePeriods = [...new Set((periods || []).map(p => p.period))].slice(0, 24)

  return (
    <AdminLayout activePage="statements" adminEmail={profile?.email || user.email}>
      <StatementsClient artists={artists || []} statements={statements || []} periods={uniquePeriods}/>
    </AdminLayout>
  )
}
