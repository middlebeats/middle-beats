import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv-parser'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const csvText = await file.text()
    const { records, source, rowCount } = parseCSV(csvText)

    if (!rowCount) return NextResponse.json({ error: 'No valid records found in file' }, { status: 400 })

    const adminSupabase = createAdminClient()

    // Load all artists for matching
    const { data: artists } = await adminSupabase.from('artists').select('id, name, name_ar')
    const artistMap = new Map<string, string>() // name → id
    for (const a of (artists || [])) {
      artistMap.set(a.name.toLowerCase().trim(), a.id)
      if (a.name_ar) artistMap.set(a.name_ar.trim(), a.id)
    }

    // Create upload record
    const { data: upload } = await adminSupabase
      .from('report_uploads')
      .insert({ filename: file.name, source, row_count: rowCount, uploaded_by: user.id })
      .select().single()

    // Match records to artists and insert
    const toInsert = []
    const unmatched = new Set<string>()

    for (const rec of records) {
      const artistName = rec.artist_name.toLowerCase().trim()
      // Try exact match, then partial match
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

    // Batch insert in chunks of 500
    const CHUNK = 500
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK)
      await adminSupabase.from('royalty_records').insert(chunk)
    }

    return NextResponse.json({
      source,
      rowCount,
      matched: toInsert.length,
      unmatched: [...unmatched],
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 })
  }
}

// Allow large file uploads
export const config = { api: { bodyParser: false } }
