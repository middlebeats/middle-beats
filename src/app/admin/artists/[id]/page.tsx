import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AdminLayout from '@/components/admin/Layout'
import Link from 'next/link'

export default async function ArtistDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role,email').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/artist/dashboard')

  const { data: artist } = await supabase.from('artists').select('*').eq('id', params.id).single()
  if (!artist) notFound()

  const { data: records } = await supabase
    .from('royalty_records')
    .select('period, platform, country, streams, revenue, track_title, release_title')
    .eq('artist_id', params.id)

  const { data: statements } = await supabase
    .from('royalty_statements')
    .select('*')
    .eq('artist_id', params.id)
    .order('created_at', { ascending: false })

  const totalRevenue = (records || []).reduce((s, r) => s + Number(r.revenue), 0)
  const totalStreams = (records || []).reduce((s, r) => s + r.streams, 0)

  // By platform
  const byPlatform: Record<string, { revenue: number; streams: number }> = {}
  for (const r of records || []) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { revenue: 0, streams: 0 }
    byPlatform[r.platform].revenue += Number(r.revenue)
    byPlatform[r.platform].streams += r.streams
  }
  const platforms = Object.entries(byPlatform).sort((a, b) => b[1].revenue - a[1].revenue)

  // By track
  const byTrack: Record<string, { revenue: number; streams: number }> = {}
  for (const r of records || []) {
    const k = r.track_title || r.release_title || 'Unknown'
    if (!byTrack[k]) byTrack[k] = { revenue: 0, streams: 0 }
    byTrack[k].revenue += Number(r.revenue)
    byTrack[k].streams += r.streams
  }
  const tracks = Object.entries(byTrack).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10)

  return (
    <AdminLayout activePage="artists" adminEmail={profile?.email || user.email}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Link href="/admin/artists" className="text-blue-300/50 hover:text-blue-300 font-mono text-xs">← Back to Artists</Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#1a55e8,#06b6d4)' }}>
            {artist.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{artist.name}</h1>
            {artist.name_ar && <div className="text-blue-300/50 text-sm mt-0.5">{artist.name_ar}</div>}
            <div className="font-mono text-xs text-blue-300/40 mt-1">{artist.email}</div>
          </div>
        </div>
        <span className={`font-mono text-xs px-3 py-1.5 rounded-lg border ${artist.is_active ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-red-400 bg-red-400/10 border-red-400/30'}`}>
          {artist.is_active ? '● Active' : '○ Inactive'}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: '💰', color: 'text-sky-300' },
          { label: 'Total Streams', value: totalStreams.toLocaleString(), icon: '🎧', color: 'text-white' },
          { label: 'Platforms', value: platforms.length, icon: '🏪', color: 'text-white' },
          { label: 'Statements', value: (statements || []).length, icon: '💸', color: 'text-white' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="absolute right-4 top-4 text-xl opacity-20">{k.icon}</div>
            <div className="font-mono text-xs tracking-widest text-blue-300/50 uppercase mb-2">{k.label}</div>
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Platform */}
        <div className="card">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <h3 className="font-mono text-xs tracking-widest text-blue-300/60 uppercase">Revenue by Platform</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
            {platforms.slice(0, 8).map(([platform, data], i) => {
              const maxRev = platforms[0]?.[1].revenue || 1
              const pct = Math.round((data.revenue / maxRev) * 100)
              return (
                <div key={platform} className="flex items-center gap-4 px-5 py-3">
                  <span className="font-mono text-xs text-blue-300/40 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate mb-1.5">{platform}</div>
                    <div className="h-1 rounded" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: '#3b82f6' }}/>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-sky-300 font-bold">${data.revenue.toFixed(4)}</div>
                    <div className="font-mono text-xs text-blue-300/40">{data.streams.toLocaleString()}</div>
                  </div>
                </div>
              )
            })}
            {!platforms.length && <div className="px-5 py-8 text-center font-mono text-xs text-blue-300/30">No data yet</div>}
          </div>
        </div>

        {/* Top Tracks */}
        <div className="card">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <h3 className="font-mono text-xs tracking-widest text-blue-300/60 uppercase">Top Tracks</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
            {tracks.map(([track, data], i) => {
              const maxRev = tracks[0]?.[1].revenue || 1
              const pct = Math.round((data.revenue / maxRev) * 100)
              return (
                <div key={track} className="flex items-center gap-4 px-5 py-3">
                  <span className="font-mono text-xs text-blue-300/40 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate mb-1.5">{track}</div>
                    <div className="h-1 rounded" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: '#8b5cf6' }}/>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-sky-300 font-bold">${data.revenue.toFixed(4)}</div>
                    <div className="font-mono text-xs text-blue-300/40">{data.streams.toLocaleString()}</div>
                  </div>
                </div>
              )
            })}
            {!tracks.length && <div className="px-5 py-8 text-center font-mono text-xs text-blue-300/30">No tracks yet</div>}
          </div>
        </div>
      </div>

      {/* Statements */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
          <h3 className="font-mono text-xs tracking-widest text-blue-300/60 uppercase">Royalty Statements</h3>
          <Link href="/admin/statements" className="font-mono text-xs text-blue-400 hover:text-blue-300">Generate →</Link>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
          {(statements || []).map(s => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-blue-sky/3 transition-colors">
              <div>
                <div className="font-mono text-sm font-bold">{s.period}</div>
                <div className="font-mono text-xs text-blue-300/40 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono text-sm text-sky-300 font-bold">${Number(s.total_revenue).toFixed(2)}</div>
                  <div className="font-mono text-xs text-blue-300/40">{s.total_streams.toLocaleString()} streams</div>
                </div>
                <span className={`font-mono text-xs px-2 py-1 rounded border ${
                  s.status === 'paid' ? 'text-green-400 bg-green-400/10 border-green-400/30' :
                  s.status === 'sent' ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' :
                  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                }`}>{s.status}</span>
              </div>
            </div>
          ))}
          {!statements?.length && <div className="px-5 py-8 text-center font-mono text-xs text-blue-300/30">No statements yet</div>}
        </div>
      </div>
    </AdminLayout>
  )
}
