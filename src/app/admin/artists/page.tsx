import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/Layout'
import Link from 'next/link'

export default async function AdminArtistsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role,email').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/artist/dashboard')

  const { data: artists } = await supabase
    .from('artists').select('*').order('name', { ascending: true })

  // Revenue per artist
  const { data: revData } = await supabase
    .from('royalty_records').select('artist_id, revenue, streams')

  const revMap: Record<string, { revenue: number; streams: number }> = {}
  for (const r of (revData || [])) {
    if (!revMap[r.artist_id]) revMap[r.artist_id] = { revenue: 0, streams: 0 }
    revMap[r.artist_id].revenue += Number(r.revenue)
    revMap[r.artist_id].streams += r.streams
  }

  return (
    <AdminLayout activePage="artists" adminEmail={profile?.email || user.email}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Artists</h1>
          <p className="font-mono text-xs text-blue-300/50 mt-1">{artists?.length ?? 0} total artists</p>
        </div>
        <Link href="/admin/artists/new" className="btn-primary">➕ Add Artist</Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(10,29,71,0.8)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                {['Artist', 'Email', 'Status', 'Revenue', 'Streams', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-mono text-xs tracking-widest text-blue-300/50 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(artists || []).map(artist => {
                const stats = revMap[artist.id] || { revenue: 0, streams: 0 }
                return (
                  <tr key={artist.id} className="border-b hover:bg-blue-sky/3 transition-colors"
                    style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#1a55e8,#06b6d4)' }}>
                          {artist.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold">{artist.name}</div>
                          {artist.name_ar && <div className="font-mono text-xs text-blue-300/40">{artist.name_ar}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-blue-300/70">{artist.email}</td>
                    <td className="px-5 py-4">
                      <span className={`font-mono text-xs px-2 py-1 rounded border ${
                        artist.is_active
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {artist.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm font-bold text-sky-300">${stats.revenue.toFixed(2)}</td>
                    <td className="px-5 py-4 font-mono text-sm text-purple-300">{stats.streams.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/artists/${artist.id}`} className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!artists?.length && (
            <div className="text-center py-16 font-mono text-xs text-blue-300/30">
              No artists yet · <Link href="/admin/artists/new" className="text-blue-400 hover:underline">Add your first artist</Link>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
