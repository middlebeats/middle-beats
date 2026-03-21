import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv-parser'

export const maxDuration = 60

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const csvText = await file.text()
    const { records, source, rowCount } = parseCSV(csvText)
    if (!rowCount) return NextResponse.json({ error: 'No valid records found' }, { status: 400 })

    const { data: artists } = await adminSupabase.from('artists').select('id, name, name_ar')
    const artistMap = new Map<string, string>()
    for (const a of (artists || [])) {
      artistMap.set(a.name.toLowerCase().trim(), a.id)
      if (a.name_ar) artistMap.set(a.name_ar.trim(), a.id)
    }

    const { data: upload } = await adminSupabase
      .from('report_uploads')
      .insert({ filename: file.name, source, row_count: rowCount, uploaded_by: user.id })
      .select().single()

    const toInsert = []
    const unmatched = new Set<string>()

    for (const rec of records) {
      const artistName = rec.artist_name.toLowerCase().trim()
      let artistId = artistMap.get(artistName)
      if (!artistId) {
        for (const [name, id] of artistMap) {
          if (artistName.includes(name) || name.includes(artistName)) { artistId = id; break }
        }
      }
      if (!artistId) { unmatched.add(rec.artist_name); continue }

      toInsert.push({
        upload_id: upload?.id,
        artist_id: artistId,
        release_title: rec.release_title,
        track_title: rec.track_title,
        period: rec.period,
        year: rec.year,
        platform: rec.platform,
        country: rec.country,
        streams: rec.streams,
        revenue: rec.revenue,
        currency: rec.currency,
        isrc: rec.isrc,
        upc: rec.upc,
        source: rec.source,
      })
    }

    const CHUNK = 500
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await adminSupabase.from('royalty_records').insert(toInsert.slice(i, i + CHUNK))
    }

    return NextResponse.json({ source, rowCount, matched: toInsert.length, unmatched: [...unmatched] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 })
  }
}
