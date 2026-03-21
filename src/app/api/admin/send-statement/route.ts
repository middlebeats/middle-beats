import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendStatementEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { statementId } = await request.json()
    if (!statementId) return NextResponse.json({ error: 'Missing statementId' }, { status: 400 })

    const adminSupabase = createAdminClient()

    const { data: stmt } = await adminSupabase
      .from('royalty_statements')
      .select('*, artists(name, email)')
      .eq('id', statementId)
      .single()

    if (!stmt) return NextResponse.json({ error: 'Statement not found' }, { status: 404 })

    const artist = stmt.artists as any
    await sendStatementEmail(
      artist.email,
      artist.name,
      stmt.period,
      Number(stmt.total_revenue),
      stmt.total_streams,
      statementId
    )

    // Mark as sent
    await adminSupabase
      .from('royalty_statements')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', statementId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
