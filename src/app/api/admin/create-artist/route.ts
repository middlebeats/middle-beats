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

    const body = await request.json()
    const { name, name_ar, email, password, phone, bio } = body
    if (!name || !email || !password) return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    // Create auth user with the provided password
    const { data: authUser, error: authErr } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'artist', artist_name: name },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    await adminSupabase.from('profiles')
      .update({ role: 'artist', artist_name: name })
      .eq('id', authUser.user.id)

    const { data: artist, error: artistErr } = await adminSupabase
      .from('artists')
      .insert({ name, name_ar: name_ar || null, email, phone: phone || null, bio: bio || null, user_id: authUser.user.id })
      .select().single()

    if (artistErr) {
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: artistErr.message }, { status: 400 })
    }

    await adminSupabase.from('notifications').insert({
      artist_id: artist.id,
      title: 'Welcome to MIDDLE BEATS!',
      message: 'Your artist portal is ready. Log in to view your analytics and royalties.',
      type: 'info',
    })

    return NextResponse.json({ success: true, artistId: artist.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
