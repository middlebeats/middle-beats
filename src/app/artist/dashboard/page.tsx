import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArtistDashboardClient from './client'

export default async function ArtistDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get artist record
  const { data: artist } = await supabase
    .from('artists').select('*').eq('user_id', user.id).single()
  if (!artist) redirect('/auth/login')

  // Get summary stats
  const { data: records } = await supabase
    .from('royalty_records')
    .select('period, year, platform, country, streams, revenue, track_title, release_title, source')
    .eq('artist_id', artist.id)

  // Get recent notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get latest statement
  const { data: latestStatement } = await supabase
    .from('royalty_statements')
    .select('*')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <ArtistDashboardClient
      artist={artist}
      records={records || []}
      notifications={notifications || []}
      latestStatement={latestStatement || null}
    />
  )
}
