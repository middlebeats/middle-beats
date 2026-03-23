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

    // STEP 1: Check for duplicate filename FIRST before doing anything
    const { data: existingUploads } = await adminSupabase
      .from('report_uploads')
      .select('id, uploaded_at')
      .eq('filename', file.name)
      .limit(1)

    if (existingUploads && existingUploads.length > 0) {
      return NextResponse.json({
        error: `"${file.name}" was already uploaded on ${new Date(existingUploads[0].uploaded_at).toLocaleDateString()}. Delete the existing upload first if you want to re-upload.`,
        duplicate: true,
      }, { status: 409 })
    }

    // STEP 2: Parse CSV
    const csvText = await file.text()
    const { records, source, rowCount } = parseCSV(csvText)
    if (!rowCount) return NextResponse.json({ error: 'No valid records found. Check CSV format.' }, { status: 400 })

    // STEP 3: Load existing artists and build exact match map
    const { data: existingArtists } = await adminSupabase.from('artists').select('id, name, name_ar')
    const artistMap = new Map<string, string>()
    for (const a of (existingArtists || [])) {
      artistMap.set(a.name.toLowerCase().trim(), a.id)
      if (a.name_ar) artistMap.set(a.name_ar.toLowerCase().trim(), a.id)
    }

    // STEP 4: Auto-create missing artists
    const newArtists: string[] = []
    const csvArtistNames = new Set(records.map(r => r.artist_name.trim()).filter(Boolean))
    for (const artistName of csvArtistNames) {
      const key = artistName.toLowerCase().trim()
      if (!artistMap.has(key)) {
        const slug = artistName.toLowerCase().replace(/[\s]/g, '.')
        const { data: newArtist, error } = await adminSupabase
          .from('artists')
          .insert({ name: artistName, email: `${slug}@middle-beats.com`, is_active: false })
          .select('id, name')
          .single()
        if (newArtist && !error) {
          artistMap.set(key, newArtist.id)
          newArtists.push(artistName)
        }
      }
    }

    // STEP 5: Create the upload record
    const { data: upload } = await adminSupabase
      .from('report_uploads')
      .insert({ filename: file.name, source, row_count: rowCount, uploaded_by: user.id })
      .select().single()

    // STEP 6: Build insert rows with exact artist matching only
    const toInsert: any[] = []
    const unmatched = new Set<string>()

    for (const rec of records) {
      const key = rec.artist_name.toLowerCase().trim()
      const artistId = artistMap.get(key)
      if (!artistId) { unmatched.add(rec.artist_name); continue }

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

    // STEP 7: Insert in chunks of 500
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
