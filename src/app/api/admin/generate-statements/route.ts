import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { artistIds, period } = await request.json()
    if (!artistIds?.length || !period) return NextResponse.json({ error: 'Missing artistIds or period' }, { status: 400 })

    const adminSupabase = createAdminClient()
    let count = 0

    for (const artistId of artistIds) {
      // Aggregate records for this artist + period
      const { data: records } = await adminSupabase
        .from('royalty_records')
        .select('revenue, streams')
        .eq('artist_id', artistId)
        .eq('period', period)

      if (!records?.length) continue

      const totalRevenue = records.reduce((s, r) => s + Number(r.revenue), 0)
      const totalStreams = records.reduce((s, r) => s + r.streams, 0)

      // Upsert statement (replace if draft)
      await adminSupabase.from('royalty_statements').upsert({
        artist_id: artistId,
        period,
        total_revenue: totalRevenue,
        total_streams: totalStreams,
        status: 'draft',
      }, { onConflict: 'artist_id,period' })

      // Add notification to artist
      await adminSupabase.from('notifications').insert({
        artist_id: artistId,
        title: `Your ${period} statement is ready`,
        message: `Revenue: $${totalRevenue.toFixed(2)} · Streams: ${totalStreams.toLocaleString()}`,
        type: 'statement',
      })

      count++
    }

    return NextResponse.json({ count })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
