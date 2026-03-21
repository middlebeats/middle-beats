import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArtistLayout from '@/components/artist/Layout'

export default async function TracksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: artist } = await supabase.from('artists').select('*').eq('user_id', user.id).single()
  if (!artist) redirect('/auth/login')

  const { data: notifications } = await supabase
    .from('notifications').select('*').eq('artist_id', artist.id)
    .order('created_at', { ascending: false }).limit(5)

  // Aggregate by track
  const { data: records } = await supabase
    .from('royalty_records')
    .select('track_title, release_title, isrc, platform, streams, revenue, period')
    .eq('artist_id', artist.id)

  // Group by track
  const trackMap: Record<string, { title: string; isrc: string; revenue: number; streams: number; platforms: Set<string>; periods: Set<string> }> = {}
  for (const r of (records || [])) {
    const key = r.track_title || r.release_title || 'Unknown'
    if (!trackMap[key]) trackMap[key] = { title: key, isrc: r.isrc || '', revenue: 0, streams: 0, platforms: new Set(), periods: new Set() }
    trackMap[key].revenue += Number(r.revenue)
    trackMap[key].streams += r.streams
    trackMap[key].platforms.add(r.platform)
    trackMap[key].periods.add(r.period)
  }
  const tracks = Object.values(trackMap).sort((a, b) => b.revenue - a.revenue)

  return (
    <ArtistLayout artist={artist} notifications={notifications || []} activePage="tracks">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Tracks</h1>
        <p className="font-mono text-xs text-blue-300/50 mt-1 tracking-wider">{tracks.length} tracks · all platforms combined</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(10,29,71,0.8)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                {['#', 'Track', 'ISRC', 'Revenue', 'Streams', 'Platforms', 'Periods'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-mono text-xs tracking-widest text-blue-300/50 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, i) => (
                <tr key={track.title} className="border-b hover:bg-blue-sky/3 transition-colors"
                  style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
                  <td className="px-5 py-3 font-mono text-xs text-blue-300/40">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-sm max-w-[200px] truncate" title={track.title}>{track.title}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-blue-300/50">{track.isrc || '—'}</td>
                  <td className="px-5 py-3 font-mono text-sm font-bold text-sky-300">${track.revenue.toFixed(4)}</td>
                  <td className="px-5 py-3 font-mono text-sm text-purple-300">{track.streams.toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs text-blue-300/60">{track.platforms.size}</td>
                  <td className="px-5 py-3 font-mono text-xs text-blue-300/60">{track.periods.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tracks.length && (
            <div className="text-center py-16 text-blue-300/30 font-mono text-xs">No track data yet</div>
          )}
        </div>
      </div>
    </ArtistLayout>
  )
}
