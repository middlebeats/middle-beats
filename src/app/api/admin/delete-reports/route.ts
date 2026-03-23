import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient()
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Count before deleting
    const { count: recordCount } = await adminSupabase
      .from('royalty_records')
      .select('*', { count: 'exact', head: true })

    const { count: uploadCount } = await adminSupabase
      .from('report_uploads')
      .select('*', { count: 'exact', head: true })

    // Delete all royalty_records first (foreign key)
    const { error: recError } = await adminSupabase
      .from('royalty_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // delete all

    if (recError) return NextResponse.json({ error: 'Failed to delete records: ' + recError.message }, { status: 500 })

    // Delete all report_uploads
    const { error: upError } = await adminSupabase
      .from('report_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // delete all

    if (upError) return NextResponse.json({ error: 'Failed to delete uploads: ' + upError.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      records: recordCount || 0,
      uploads: uploadCount || 0,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
