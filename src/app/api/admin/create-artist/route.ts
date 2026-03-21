import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is admin
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, name_ar, email, phone, bio } = body
    if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

    // Use admin client (service role) to create auth user
    const adminSupabase = createAdminClient()
    const tempPassword = generatePassword()

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'artist', artist_name: name },
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Update profile role (trigger creates the profile, we update it)
    await adminSupabase
      .from('profiles')
      .update({ role: 'artist', artist_name: name })
      .eq('id', authUser.user.id)

    // Create artist record
    const { data: artist, error: artistError } = await adminSupabase
      .from('artists')
      .insert({ name, name_ar: name_ar || null, email, phone: phone || null, bio: bio || null, user_id: authUser.user.id })
      .select().single()

    if (artistError) {
      // Rollback auth user
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: artistError.message }, { status: 400 })
    }

    // Send welcome notification
    await adminSupabase.from('notifications').insert({
      artist_id: artist.id,
      title: 'Welcome to Middle Beats!',
      message: 'Your artist portal is ready. Log in to view your analytics and royalties.',
      type: 'info',
    })

    // Send welcome email
    await sendWelcomeEmail(email, name, tempPassword)

    return NextResponse.json({ success: true, artistId: artist.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
