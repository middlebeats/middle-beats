'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin/Layout'

const mono = "'DM Mono',monospace"
const syne = "'Syne',sans-serif"
const sans = "'DM Sans',sans-serif"
const PAL = ['#93c5fd','#6ee7b7','#c4b5fd','#fde68a','#f9a8d4','#67e8f9','#86efac','#fca5a5']

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')

  async function load() {
    setRefreshing(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/auth/login'; return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') { window.location.href = '/artist/dashboard'; return }
    setAdminEmail(session.user.email || '')

    const [
      { count: artistCount },
      { count: recordCount },
      { count: uploadCount },
      { data: recentUploads },
      { data: allArtists },
    ] = await Promise.all([
      supabase.from('artists').select('*', { count:'exact', head:true }),
      supabase.from('royalty_records').select('id', { count:'exact', head:true }),
      supabase.from('report_uploads').select('*', { count:'exact', head:true }),
      supabase.from('report_uploads').select('id,filename,source,row_count,uploaded_at').order('uploaded_at',{ascending:false}).limit(6),
      supabase.from('artists').select('id,name,is_active'),
    ])

    let totalRevenue = 0
    const artistRevMap: Record<string,{name:string;revenue:number;streams:number}> = {}
    if (allArtists) {
      for (let i = 0; i < allArtists.length; i += 8) {
        await Promise.all(allArtists.slice(i, i+8).map(async artist => {
          const { data: rows } = await supabase.from('royalty_records').select('revenue,streams').eq('artist_id', artist.id).limit(100000)
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

  useEffect(() => { load() }, [])

  const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#030a1c' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ color:'rgba(147,197,253,0.6)', fontFamily:mono, fontSize:11, letterSpacing:3, marginBottom:8 }}>LOADING DASHBOARD</div>
        <div style={{ color:'rgba(147,197,253,0.3)', fontFamily:mono, fontSize:10 }}>Calculating revenue across all artists...</div>
      </div>
    </div>
  )

  return (
    <AdminLayout activePage="dashboard" adminEmail={adminEmail}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap' as const, gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:0, fontFamily:syne }}>Admin Dashboard</h1>
          <p style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4, letterSpacing:1 }}>Platform overview · MIDDLE BEATS</p>
        </div>
        <button onClick={load} disabled={refreshing} style={{ background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.25)', borderRadius:10, padding:'9px 18px', color:'#93c5fd', fontFamily:mono, fontSize:10, letterSpacing:2, cursor:refreshing?'not-allowed':'pointer', opacity:refreshing?0.6:1 }}>
          {refreshing?'REFRESHING...':'↻ REFRESH'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {[
          { label:'Total Revenue', value:'$'+((data?.totalRevenue||0).toFixed(2)), sub:'All time', color:'#93c5fd', icon:'💰' },
          { label:'Artists', value:data?.artistCount||0, sub:`${data?.activeCount||0} active · ${data?.inactiveCount||0} inactive`, color:'#c4b5fd', icon:'🎤' },
          { label:'Records', value:(data?.recordCount||0).toLocaleString(), sub:'Royalty rows', color:'#6ee7b7', icon:'📊' },
          { label:'Uploads', value:data?.uploadCount||0, sub:'CSV files', color:'#fde68a', icon:'📂' },
        ].map(k=>(
          <div key={k.label} style={{ ...card, padding:'18px 20px', position:'relative' as const }}>
            <div style={{ position:'absolute' as const, right:14, top:12, fontSize:20, opacity:0.12 }}>{k.icon}</div>
            <div style={{ fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.3)', textTransform:'uppercase' as const, marginBottom:10 }}>{k.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:k.color, lineHeight:1, fontFamily:syne, marginBottom:6 }}>{k.value}</div>
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
              <a key={a.name} href={"/admin/artists"} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)', textDecoration:'none' }}>
                <span style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.2)', width:16, textAlign:'right' as const }}>{i+1}</span>
                <div style={{ width:7, height:7, borderRadius:'50%', background:PAL[i%PAL.length], flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:5, whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis' }}>{a.name}</div>
                  <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                    <div style={{ height:'100%', background:PAL[i%PAL.length], borderRadius:2, width:pct+'%', transition:'width 0.5s' }}/>
                  </div>
                </div>
                <div style={{ textAlign:'right' as const, flexShrink:0 }}>
                  <div style={{ fontFamily:mono, fontSize:12, color:PAL[i%PAL.length], fontWeight:700 }}>${a.revenue.toFixed(2)}</div>
                  <div style={{ fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:2 }}>{a.streams.toLocaleString()}</div>
                </div>
              </a>
            )
          })}
          {!data?.topArtists?.length && <div style={{ padding:32, textAlign:'center' as const, fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.2)' }}>No data yet — upload reports first</div>}
        </div>

        {/* Recent Uploads */}
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const }}>Recent Uploads</span>
            <a href="/admin/upload" style={{ fontFamily:mono, fontSize:11, color:'#93c5fd', textDecoration:'none' }}>Upload →</a>
          </div>
          {(data?.recentUploads||[]).map((u:any)=>(
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13 }}>📄</div>
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
          {href:'/admin/artists/new',icon:'➕',label:'Add Artist',desc:'Create artist account',color:'rgba(37,99,235,0.1)',border:'rgba(37,99,235,0.2)'},
          {href:'/admin/upload',icon:'↑',label:'Upload Report',desc:'Process CSV files',color:'rgba(6,182,212,0.08)',border:'rgba(6,182,212,0.15)'},
          {href:'/admin/artists',icon:'🎤',label:'All Artists',desc:'Manage roster',color:'rgba(139,92,246,0.08)',border:'rgba(139,92,246,0.15)'},
          {href:'/admin/statements',icon:'💸',label:'Statements',desc:'Royalty payouts',color:'rgba(234,179,8,0.08)',border:'rgba(234,179,8,0.15)'},
        ].map(a=>(
          <a key={a.label} href={a.href} style={{ background:a.color, border:'1px solid '+a.border, borderRadius:14, padding:'18px', textDecoration:'none', display:'block', transition:'transform 0.15s' }}>
            <div style={{ fontSize:22, marginBottom:10 }}>{a.icon}</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:syne }}>{a.label}</div>
            <div style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.3)' }}>{a.desc}</div>
          </a>
        ))}
      </div>
    </AdminLayout>
  )
}
