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
    if (!rowCount) return NextResponse.json({ error: 'No valid records found. Check CSV format.' }, { status: 400 })

    // Load all existing artists
    const { data: existingArtists } = await adminSupabase.from('artists').select('id, name, name_ar')

    // Build EXACT match map only — no fuzzy matching
    const artistMap = new Map<string, string>()
    for (const a of (existingArtists || [])) {
      artistMap.set(a.name.toLowerCase().trim(), a.id)
      if (a.name_ar) artistMap.set(a.name_ar.toLowerCase().trim(), a.id)
    }

    // Find ALL unique artist names in this CSV
    const csvArtistNames = new Set<string>()
    for (const rec of records) {
      if (rec.artist_name.trim()) csvArtistNames.add(rec.artist_name.trim())
    }

    // Auto-create only artists that have NO exact match
    const newArtists: string[] = []
    for (const artistName of csvArtistNames) {
      const key = artistName.toLowerCase().trim()
      if (!artistMap.has(key)) {
        // Create new artist record (inactive, no login)
        const { data: newArtist, error } = await adminSupabase
          .from('artists')
          .insert({
            name: artistName,
            email: `${artistName.toLowerCase().replace(/[\s]/g, '.')}@middle-beats.com`,
            is_active: false,
          })
          .select('id, name')
          .single()

        if (newArtist && !error) {
          artistMap.set(key, newArtist.id)
          newArtists.push(artistName)
        }
      }
    }

    // Create upload record
    const { data: upload } = await adminSupabase
      .from('report_uploads')
      .insert({ filename: file.name, source, row_count: rowCount, uploaded_by: user.id })
      .select().single()

    // Build insert array — EXACT match only
    const toInsert = []
    const unmatched = new Set<string>()

    for (const rec of records) {
      const key = rec.artist_name.toLowerCase().trim()
      const artistId = artistMap.get(key)

      if (!artistId) {
        unmatched.add(rec.artist_name)
        continue
      }

      toInsert.push({
        upload_id: upload?.id,
        artist_id: artistId,
        release_title: rec.release_title || null,
        track_title: rec.track_title || null,
        period: rec.period || null,
        year: rec.year || null,
        platform: rec.platform || null,
        country: rec.country || null,
        streams: rec.streams || 0,
        revenue: rec.revenue || 0,
        currency: rec.currency || 'USD',
        isrc: rec.isrc || null,
        upc: rec.upc || null,
        source: rec.source,
      })
    }

    // Insert in chunks of 500
    const CHUNK = 500
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const { error } = await adminSupabase.from('royalty_records').insert(toInsert.slice(i, i + CHUNK))
      if (error) console.error('Insert error at chunk', i, error.message)
    }

    return NextResponse.json({
      source,
      rowCount,
      matched: toInsert.length,
      unmatched: [...unmatched],
      autoCreated: newArtists,
    })

  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 })
  }
}
