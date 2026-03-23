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
    const { action, artistId, name, email, nameAr, newPassword } = body

    if (action === 'activate') {
      const { data: artist } = await adminSupabase.from('artists').select('*').eq('id', artistId).single()
      if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

      if (!artist.user_id) {
        const tempPassword = newPassword || (Math.random().toString(36).slice(-6) + 'Mb' + Math.floor(Math.random()*900+100) + '!')
        const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
          email: artist.email, password: tempPassword, email_confirm: true,
        })
        if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })
        await adminSupabase.from('profiles').upsert({ id: newUser.user.id, role: 'artist', email: artist.email })
        await adminSupabase.from('artists').update({ user_id: newUser.user.id, is_active: true }).eq('id', artistId)
        return NextResponse.json({ success: true, password: tempPassword, userId: newUser.user.id })
      } else {
        await adminSupabase.from('artists').update({ is_active: true }).eq('id', artistId)
        return NextResponse.json({ success: true })
      }
    }

    if (action === 'deactivate') {
      await adminSupabase.from('artists').update({ is_active: false }).eq('id', artistId)
      return NextResponse.json({ success: true })
    }

    if (action === 'update') {
      const updates: any = {}
      if (name) updates.name = name
      if (email) updates.email = email
      if (nameAr !== undefined) updates.name_ar = nameAr
      await adminSupabase.from('artists').update(updates).eq('id', artistId)
      return NextResponse.json({ success: true })
    }

    if (action === 'set_password') {
      const { data: artist } = await adminSupabase.from('artists').select('user_id').eq('id', artistId).single()
      if (!artist?.user_id) return NextResponse.json({ error: 'Activate this artist first to set a password.' }, { status: 400 })
      const { error: pwErr } = await adminSupabase.auth.admin.updateUserById(artist.user_id, { password: newPassword })
      if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'generate_password') {
      const { data: artist } = await adminSupabase.from('artists').select('user_id').eq('id', artistId).single()
      if (!artist?.user_id) return NextResponse.json({ error: 'Activate this artist first.' }, { status: 400 })
      const pw = Math.random().toString(36).slice(-5) + 'Mb' + Math.floor(Math.random()*900+100) + '!'
      const { error: pwErr } = await adminSupabase.auth.admin.updateUserById(artist.user_id, { password: pw })
      if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 })
      return NextResponse.json({ success: true, password: pw })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
