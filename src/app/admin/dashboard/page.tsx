'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin/Layout'
import { useAdminAuth } from '@/lib/useAdminAuth'

const mono = "'DM Mono',monospace"
const syne = "'Syne',sans-serif"
const sans = "'DM Sans',sans-serif"
const PAL = ['#93c5fd','#6ee7b7','#c4b5fd','#fde68a','#f9a8d4','#67e8f9','#86efac','#fca5a5']

const IC = {
  revenue: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/><path d="M16 6H8M16 18H8"/></svg>,
  artists: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  records: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  uploads: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
}

export default function AdminDashboard() {
  const auth = useAdminAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!auth.authorized) return
    setRefreshing(true)
    const supabase = createClient()

    const [
      { count: artistCount },
      { count: uploadCount },
      { data: recentUploads },
      { data: allArtists },
    ] = await Promise.all([
      supabase.from('artists').select('*', { count:'exact', head:true }),
      supabase.from('report_uploads').select('*', { count:'exact', head:true }),
      supabase.from('report_uploads').select('id,filename,source,row_count,uploaded_at').order('uploaded_at',{ascending:false}).limit(6),
      supabase.from('artists').select('id,name,is_active'),
    ])

    // Get record count by summing upload row_counts (avoids RLS issue on royalty_records count)
    const { data: uploadCounts } = await supabase.from('report_uploads').select('row_count')
    const recordCount = (uploadCounts||[]).reduce((s:number,u:any)=>s+(u.row_count||0),0)

    // Revenue per artist in batches of 6 (fast parallel)
    let totalRevenue = 0
    const artistRevMap: Record<string,{name:string;revenue:number;streams:number}> = {}
    if (allArtists?.length) {
      for (let i = 0; i < allArtists.length; i += 6) {
        await Promise.all(allArtists.slice(i, i+6).map(async artist => {
          const { data: rows } = await supabase
            .from('royalty_records').select('revenue,streams').eq('artist_id', artist.id).limit(200000)
          if (rows?.length) {
            const rev = rows.reduce((s:number,r:any)=>s+Number(r.revenue||0),0)
            const str = rows.reduce((s:number,r:any)=>s+(r.streams||0),0)
            if (rev > 0 || str > 0) artistRevMap[artist.id] = { name:artist.name, revenue:rev, streams:str }
            totalRevenue += rev
          }
        }))
      }
    }

    const topArtists = Object.values(artistRevMap).sort((a,b)=>b.revenue-a.revenue).slice(0,8)
    const activeCount = allArtists?.filter(a=>a.is_active).length || 0

    setData({ artistCount, recordCount, uploadCount, totalRevenue, recentUploads, topArtists, activeCount, inactiveCount:(artistCount||0)-activeCount })
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { if (auth.ready) load() }, [auth.ready])

  const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }

  if (!auth.ready || loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#030a1c' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ color:'rgba(147,197,253,0.6)', fontFamily:mono, fontSize:11, letterSpacing:3, marginBottom:8 }}>LOADING DASHBOARD</div>
        <div style={{ color:'rgba(147,197,253,0.3)', fontFamily:mono, fontSize:10 }}>Calculating revenue across all artists...</div>
      </div>
    </div>
  )

  return (
    <AdminLayout activePage="dashboard" adminEmail={auth.email}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap' as const, gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:0, fontFamily:syne }}>Admin Dashboard</h1>
          <p style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4, letterSpacing:1 }}>Platform overview · MIDDLE BEATS</p>
        </div>
        <button onClick={load} disabled={refreshing} style={{ background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.25)', borderRadius:10, padding:'9px 18px', color:'#93c5fd', fontFamily:mono, fontSize:10, letterSpacing:2, cursor:refreshing?'not-allowed':'pointer', opacity:refreshing?0.6:1, display:'flex', alignItems:'center', gap:8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {refreshing?'REFRESHING...':'REFRESH'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {[
          { label:'Total Revenue', value:'$'+((data?.totalRevenue||0).toFixed(2)), sub:'All artists · all time', color:'#93c5fd', icon:IC.revenue },
          { label:'Artists', value:data?.artistCount||0, sub:`${data?.activeCount||0} active · ${data?.inactiveCount||0} inactive`, color:'#c4b5fd', icon:IC.artists },
          { label:'Records', value:(data?.recordCount||0).toLocaleString(), sub:'Total royalty rows', color:'#6ee7b7', icon:IC.records },
          { label:'Uploads', value:data?.uploadCount||0, sub:'CSV files processed', color:'#fde68a', icon:IC.uploads },
        ].map(k=>(
          <div key={k.label} style={{ ...card, padding:'20px 20px 16px', position:'relative' as const }}>
            <div style={{ position:'absolute' as const, right:16, top:16, color:'rgba(255,255,255,0.1)' }}>{k.icon}</div>
            <div style={{ fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.3)', textTransform:'uppercase' as const, marginBottom:12 }}>{k.label}</div>
            <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1, fontFamily:syne, marginBottom:8 }}>{k.value}</div>
            <div style={{ fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.2)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:18, marginBottom:18 }}>
        {/* Top Artists */}
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const }}>Top Artists by Revenue</span>
            <a href="/admin/artists" style={{ fontFamily:mono, fontSize:11, color:'#93c5fd', textDecoration:'none' }}>View all →</a>
          </div>
          {(data?.topArtists||[]).map((a:any,i:number)=>{
            const pct = Math.round((a.revenue/((data.topArtists[0]?.revenue)||1))*100)
            return (
              <a key={a.name} href="/admin/artists" style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)', textDecoration:'none' }}>
                <span style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.2)', width:18, textAlign:'right' as const, flexShrink:0 }}>{i+1}</span>
                <div style={{ width:7, height:7, borderRadius:'50%', background:PAL[i%PAL.length], flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:5, whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis' }}>{a.name}</div>
                  <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                    <div style={{ height:'100%', background:PAL[i%PAL.length], borderRadius:2, width:pct+'%' }}/>
                  </div>
                </div>
                <div style={{ textAlign:'right' as const, flexShrink:0, minWidth:80 }}>
                  <div style={{ fontFamily:mono, fontSize:12, color:PAL[i%PAL.length], fontWeight:700 }}>${a.revenue.toFixed(2)}</div>
                  <div style={{ fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:2 }}>{a.streams.toLocaleString()} str</div>
                </div>
              </a>
            )
          })}
          {!data?.topArtists?.length && <div style={{ padding:32, textAlign:'center' as const, fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.2)' }}>No revenue data yet</div>}
        </div>

        {/* Recent Uploads */}
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const }}>Recent Uploads</span>
            <a href="/admin/upload" style={{ fontFamily:mono, fontSize:11, color:'#93c5fd', textDecoration:'none' }}>Upload →</a>
          </div>
          {(data?.recentUploads||[]).map((u:any)=>(
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#93c5fd' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.65)', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis' }}>{u.filename}</div>
                <div style={{ fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:3 }}>{u.row_count?.toLocaleString()} rows · {new Date(u.uploaded_at).toLocaleDateString()}</div>
              </div>
              <span style={{ fontFamily:mono, fontSize:8, padding:'2px 6px', borderRadius:4, flexShrink:0, letterSpacing:0.5, background:u.source==='anghami'?'rgba(239,68,68,0.1)':'rgba(37,99,235,0.1)', color:u.source==='anghami'?'#fca5a5':'#93c5fd', border:'1px solid '+(u.source==='anghami'?'rgba(239,68,68,0.2)':'rgba(37,99,235,0.2)') }}>
                {u.source==='anghami'?'ANGHAMI':'PLATFORM'}
              </span>
            </div>
          ))}
          {!data?.recentUploads?.length && <div style={{ padding:32, textAlign:'center' as const, fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.2)' }}>No uploads yet</div>}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { href:'/admin/artists/new', label:'Add Artist', desc:'Create artist account', color:'rgba(37,99,235,0.1)', border:'rgba(37,99,235,0.2)', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
          { href:'/admin/upload', label:'Upload Report', desc:'Process CSV files', color:'rgba(6,182,212,0.08)', border:'rgba(6,182,212,0.18)', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
          { href:'/admin/artists', label:'All Artists', desc:'Manage roster', color:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.18)', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { href:'/admin/statements', label:'Statements', desc:'Royalty payouts', color:'rgba(234,179,8,0.08)', border:'rgba(234,179,8,0.18)', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
        ].map(a=>(
          <a key={a.label} href={a.href} style={{ background:a.color, border:'1px solid '+a.border, borderRadius:14, padding:'20px 18px', textDecoration:'none', display:'flex', flexDirection:'column' as const, gap:10, transition:'transform 0.15s' }}>
            <div style={{ color:'rgba(255,255,255,0.6)' }}>{a.icon}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:3, fontFamily:syne }}>{a.label}</div>
              <div style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.3)' }}>{a.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </AdminLayout>
  )
}
