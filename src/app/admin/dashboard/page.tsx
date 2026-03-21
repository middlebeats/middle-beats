'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminDashboardClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { window.location.href = '/artist/dashboard'; return }

      setUserEmail(session.user.email || '')

      const [
        { count: artistCount },
        { count: recordCount },
        { count: uploadCount },
        { data: revData },
        { data: recentUploads },
        { data: artistRevData },
      ] = await Promise.all([
        supabase.from('artists').select('*', { count: 'exact', head: true }),
        supabase.from('royalty_records').select('*', { count: 'exact', head: true }),
        supabase.from('report_uploads').select('*', { count: 'exact', head: true }),
        supabase.from('royalty_records').select('revenue'),
        supabase.from('report_uploads').select('id, filename, source, row_count, uploaded_at').order('uploaded_at', { ascending: false }).limit(5),
        supabase.from('royalty_records').select('artist_id, revenue, artists(name)'),
      ])

      const totalRevenue = (revData || []).reduce((s: number, r: any) => s + Number(r.revenue), 0)

      const artistRevMap: Record<string, { name: string; revenue: number }> = {}
      for (const r of (artistRevData || [])) {
        const a = r.artists as any
        if (!a) continue
        if (!artistRevMap[r.artist_id]) artistRevMap[r.artist_id] = { name: a.name, revenue: 0 }
        artistRevMap[r.artist_id].revenue += Number(r.revenue)
      }
      const topArtists = Object.values(artistRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

      setData({ artistCount, recordCount, uploadCount, totalRevenue, recentUploads, topArtists })
      setLoading(false)
    }
    load()
  }, [])

  async function logout() {
    await createClient().auth.signOut()
    window.location.href = '/auth/login'
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#040e2b' }}>
      <div style={{ color:'rgba(125,163,252,0.6)', fontFamily:'monospace', fontSize:12, letterSpacing:3 }}>LOADING DASHBOARD...</div>
    </div>
  )

  const kpis = [
    { label:'Total Revenue', value:`$${(data?.totalRevenue||0).toFixed(2)}`, icon:'💰', color:'#7dd3fc' },
    { label:'Artists', value: data?.artistCount ?? 0, icon:'🎤', color:'#fff' },
    { label:'Records', value: (data?.recordCount ?? 0).toLocaleString(), icon:'🗃️', color:'#fff' },
    { label:'Uploads', value: data?.uploadCount ?? 0, icon:'📂', color:'#fff' },
  ]

  const s = {
    page: { minHeight:'100vh', background:'#040e2b', backgroundImage:'radial-gradient(ellipse 80% 50% at 80% -10%,rgba(18,68,204,0.35) 0%,transparent 60%)' } as React.CSSProperties,
    header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:64, borderBottom:'1px solid rgba(59,130,246,0.15)', background:'rgba(4,14,43,0.95)', position:'sticky', top:0, zIndex:100 } as React.CSSProperties,
    sidebar: { width:220, borderRight:'1px solid rgba(59,130,246,0.1)', padding:'24px 0', background:'rgba(4,14,43,0.5)', flexShrink:0 } as React.CSSProperties,
    card: { background:'rgba(7,21,53,1)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:16, overflow:'hidden' } as React.CSSProperties,
  }

  const nav = [
    { href:'/admin/dashboard', label:'Dashboard', icon:'📊', active:true },
    { href:'/admin/artists', label:'Artists', icon:'🎤' },
    { href:'/admin/upload', label:'Upload Reports', icon:'📂' },
    { href:'/admin/statements', label:'Statements', icon:'💸' },
  ]

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={{ fontSize:20, fontWeight:800, letterSpacing:3, color:'#fff' }}>
          MIDDLE <span style={{ color:'#7dd3fc' }}>BEATS</span>
          <span style={{ fontSize:10, background:'rgba(59,130,246,0.15)', color:'#7eb8ff', padding:'2px 8px', borderRadius:4, fontFamily:'monospace', letterSpacing:2, marginLeft:10 }}>ADMIN</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.4)' }}>{userEmail}</span>
          <button onClick={logout} style={{ background:'transparent', border:'1px solid rgba(59,130,246,0.25)', borderRadius:8, padding:'6px 14px', color:'rgba(125,163,252,0.5)', fontFamily:'monospace', fontSize:10, cursor:'pointer', letterSpacing:1 }}>SIGN OUT</button>
        </div>
      </header>

      <div style={{ display:'flex', minHeight:'calc(100vh - 64px)' }}>
        <aside style={s.sidebar}>
          {nav.map(item => (
            <a key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 24px', fontSize:13, fontWeight:500, color: item.active ? '#fff' : 'rgba(200,216,248,0.45)', textDecoration:'none', borderLeft: item.active ? '2px solid #3b82f6' : '2px solid transparent', background: item.active ? 'rgba(59,130,246,0.1)' : 'transparent' }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
            </a>
          ))}
          <div style={{ padding:'20px 24px', borderTop:'1px solid rgba(59,130,246,0.08)', marginTop:'auto', fontFamily:'monospace', fontSize:10, color:'rgba(90,122,184,0.4)' }}>MIDDLE BEATS ADMIN</div>
        </aside>

        <main style={{ flex:1, padding:'32px 36px', overflowY:'auto' as const }}>
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:0 }}>Admin Dashboard</h1>
            <p style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.4)', marginTop:4, letterSpacing:1 }}>Full platform overview · MIDDLE BEATS</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:28 }}>
            {kpis.map(k => (
              <div key={k.label} style={{ background:'rgba(7,21,53,1)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:14, padding:'20px 22px', position:'relative' as const }}>
                <div style={{ position:'absolute' as const, right:16, top:16, fontSize:22, opacity:0.18 }}>{k.icon}</div>
                <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:'rgba(90,122,184,0.6)', textTransform:'uppercase' as const, marginBottom:10 }}>{k.label}</div>
                <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <div style={s.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 22px', borderBottom:'1px solid rgba(59,130,246,0.08)' }}>
                <span style={{ fontFamily:'monospace', fontSize:10, letterSpacing:2, color:'rgba(200,216,248,0.5)', textTransform:'uppercase' as const }}>Top Artists by Revenue</span>
                <a href="/admin/artists" style={{ fontFamily:'monospace', fontSize:11, color:'#60a5fa', textDecoration:'none' }}>View all →</a>
              </div>
              {(data?.topArtists || []).map((a: any, i: number) => {
                const pct = Math.round((a.revenue / (data.topArtists[0]?.revenue || 1)) * 100)
                return (
                  <div key={a.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 22px', borderBottom:'1px solid rgba(59,130,246,0.05)' }}>
                    <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(90,122,184,0.5)', width:18 }}>{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:5 }}>{a.name}</div>
                      <div style={{ height:3, background:'rgba(59,130,246,0.1)', borderRadius:2 }}>
                        <div style={{ height:'100%', background:'#3b82f6', borderRadius:2, width:`${pct}%` }}/>
                      </div>
                    </div>
                    <span style={{ fontFamily:'monospace', fontSize:12, color:'#7dd3fc', fontWeight:700 }}>${a.revenue.toFixed(2)}</span>
                  </div>
                )
              })}
              {!data?.topArtists?.length && <div style={{ padding:'32px', textAlign:'center' as const, fontFamily:'monospace', fontSize:11, color:'rgba(90,122,184,0.35)' }}>No data yet — upload reports first</div>}
            </div>

            <div style={s.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 22px', borderBottom:'1px solid rgba(59,130,246,0.08)' }}>
                <span style={{ fontFamily:'monospace', fontSize:10, letterSpacing:2, color:'rgba(200,216,248,0.5)', textTransform:'uppercase' as const }}>Recent Uploads</span>
                <a href="/admin/upload" style={{ fontFamily:'monospace', fontSize:11, color:'#60a5fa', textDecoration:'none' }}>Upload new →</a>
              </div>
              {(data?.recentUploads || []).map((u: any) => (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 22px', borderBottom:'1px solid rgba(59,130,246,0.05)' }}>
                  <span>📄</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(200,216,248,0.7)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.filename}</div>
                    <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(90,122,184,0.45)', marginTop:2 }}>{u.row_count} rows · {new Date(u.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontFamily:'monospace', fontSize:9, padding:'2px 7px', borderRadius:3, background:u.source==='anghami'?'rgba(255,80,100,0.1)':'rgba(59,130,246,0.1)', color:u.source==='anghami'?'#ff8090':'#7eb8ff' }}>{u.source==='anghami'?'ANGHAMI':'PLATFORM'}</span>
                </div>
              ))}
              {!data?.recentUploads?.length && <div style={{ padding:'32px', textAlign:'center' as const, fontFamily:'monospace', fontSize:11, color:'rgba(90,122,184,0.35)' }}>No uploads yet</div>}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { label:'Add Artist', icon:'➕', href:'/admin/artists/new', desc:'Create artist account' },
              { label:'Upload Report', icon:'📂', href:'/admin/upload', desc:'Process CSV files' },
              { label:'All Artists', icon:'🎤', href:'/admin/artists', desc:'Manage roster' },
              { label:'Statements', icon:'💸', href:'/admin/statements', desc:'Royalty statements' },
            ].map(a => (
              <a key={a.label} href={a.href} style={{ background:'rgba(7,21,53,1)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:14, padding:'20px', textDecoration:'none', display:'block' }}>
                <div style={{ fontSize:24, marginBottom:10 }}>{a.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:4 }}>{a.label}</div>
                <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(90,122,184,0.45)' }}>{a.desc}</div>
              </a>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
