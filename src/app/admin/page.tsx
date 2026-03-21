import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/Layout'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/artist/dashboard')

  // Stats
  const [
    { count: artistCount },
    { count: recordCount },
    { count: uploadCount },
    { data: revenueData },
    { data: recentArtists },
    { data: recentUploads },
  ] = await Promise.all([
    supabase.from('artists').select('*', { count: 'exact', head: true }),
    supabase.from('royalty_records').select('*', { count: 'exact', head: true }),
    supabase.from('report_uploads').select('*', { count: 'exact', head: true }),
    supabase.from('royalty_records').select('revenue'),
    supabase.from('artists').select('id, name, email, is_active, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('report_uploads').select('id, filename, source, row_count, uploaded_at').order('uploaded_at', { ascending: false }).limit(5),
  ])

  const totalRevenue = (revenueData || []).reduce((s, r) => s + Number(r.revenue), 0)

  // Revenue by artist
  const { data: artistRevenue } = await supabase
    .from('royalty_records')
    .select('artist_id, revenue, artists(name)')

  const artistRevMap: Record<string, { name: string; revenue: number }> = {}
  for (const r of (artistRevenue || [])) {
    const a = r.artists as any
    if (!a) continue
    if (!artistRevMap[r.artist_id]) artistRevMap[r.artist_id] = { name: a.name, revenue: 0 }
    artistRevMap[r.artist_id].revenue += Number(r.revenue)
  }
  const topArtists = Object.values(artistRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const kpis = [
    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: '💰', color: 'text-sky-300' },
    { label: 'Active Artists', value: artistCount ?? 0, icon: '🎤', color: 'text-white' },
    { label: 'Total Records', value: (recordCount ?? 0).toLocaleString(), icon: '🗃️', color: 'text-white' },
    { label: 'Report Uploads', value: uploadCount ?? 0, icon: '📂', color: 'text-white' },
  ]

  return (
    <AdminLayout activePage="dashboard" adminEmail={profile?.email || user.email}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="font-mono text-xs text-blue-300/50 mt-1 tracking-wider">Full platform overview · Middle Beats</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="absolute right-4 top-4 text-2xl opacity-20">{k.icon}</div>
            <div className="font-mono text-xs tracking-widest text-blue-300/50 uppercase mb-2">{k.label}</div>
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Artists */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <h3 className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">Top Artists by Revenue</h3>
            <Link href="/admin/artists" className="font-mono text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
            {topArtists.map((a, i) => {
              const pct = topArtists[0] ? Math.round((a.revenue / topArtists[0].revenue) * 100) : 0
              return (
                <div key={a.name} className="flex items-center gap-4 px-6 py-3 hover:bg-blue-sky/3 transition-colors">
                  <span className="font-mono text-xs text-blue-300/40 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{a.name}</div>
                    <div className="h-1 mt-1.5 rounded" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: '#3b82f6' }}/>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-sky-300 font-bold flex-shrink-0">${a.revenue.toFixed(2)}</span>
                </div>
              )
            })}
            {!topArtists.length && <div className="px-6 py-8 text-center font-mono text-xs text-blue-300/30">No data yet</div>}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <h3 className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">Recent Uploads</h3>
            <Link href="/admin/upload" className="font-mono text-xs text-blue-400 hover:text-blue-300">Upload new →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
            {(recentUploads || []).map(u => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-3 hover:bg-blue-sky/3 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs truncate text-blue-200">{u.filename}</div>
                  <div className="font-mono text-xs text-blue-300/40 mt-0.5">
                    {u.row_count} rows · {new Date(u.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                  u.source === 'anghami' ? 'badge-anghami' : 'badge-platform'
                }`}>
                  {u.source === 'anghami' ? 'Anghami' : 'Platform'}
                </span>
              </div>
            ))}
            {!recentUploads?.length && <div className="px-6 py-8 text-center font-mono text-xs text-blue-300/30">No uploads yet</div>}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Add Artist', icon: '➕', href: '/admin/artists/new', desc: 'Create artist account' },
          { label: 'Upload Report', icon: '📂', href: '/admin/upload', desc: 'Process CSV files' },
          { label: 'View All Data', icon: '🗃️', href: '/admin/reports', desc: 'Browse all records' },
          { label: 'Send Statements', icon: '💸', href: '/admin/statements', desc: 'Issue royalty statements' },
        ].map(a => (
          <Link key={a.label} href={a.href}
            className="card p-5 hover:border-blue-sky/40 hover:-translate-y-0.5 transition-all duration-200 block">
            <div className="text-2xl mb-3">{a.icon}</div>
            <div className="font-bold text-sm mb-1">{a.label}</div>
            <div className="font-mono text-xs text-blue-300/40">{a.desc}</div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  )
}
