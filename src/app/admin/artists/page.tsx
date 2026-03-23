'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin/Layout'

const mono = "'DM Mono',monospace"
const syne = "'Syne',sans-serif"
const sans = "'DM Sans',sans-serif"

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [revMap, setRevMap] = useState<Record<string,{revenue:number;streams:number}>>({})
  const [loading, setLoading] = useState(true)
  const [loadingRevenue, setLoadingRevenue] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all'|'active'|'inactive'>('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      setAdminEmail(session.user.email || '')

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { window.location.href = '/artist/dashboard'; return }

      const { data: artistData } = await supabase.from('artists').select('*').order('name')
      setArtists(artistData || [])
      setLoading(false)

      // Load revenue per artist in background
      setLoadingRevenue(true)
      const map: Record<string,{revenue:number;streams:number}> = {}
      const artists = artistData || []
      for (let i = 0; i < artists.length; i += 6) {
        await Promise.all(artists.slice(i, i+6).map(async (artist) => {
          const { data: rows } = await supabase
            .from('royalty_records').select('revenue,streams').eq('artist_id', artist.id).limit(200000)
          if (rows?.length) {
            map[artist.id] = {
              revenue: rows.reduce((s:number,r:any)=>s+Number(r.revenue||0),0),
              streams: rows.reduce((s:number,r:any)=>s+(r.streams||0),0),
            }
          }
        }))
        setRevMap({...map}) // update incrementally so user sees data appearing
      }
      setLoadingRevenue(false)
    }
    load()
  }, [])

  const filtered = artists.filter(a => {
    if (filterStatus === 'active' && !a.is_active) return false
    if (filterStatus === 'inactive' && a.is_active) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <AdminLayout activePage="artists" adminEmail={adminEmail}>
      <div style={{ padding:60, textAlign:'center', fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:2 }}>LOADING...</div>
    </AdminLayout>
  )

  const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }

  return (
    <AdminLayout activePage="artists" adminEmail={adminEmail}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap' as const, gap:14 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:0, fontFamily:syne }}>Artists</h1>
          <p style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4 }}>
            {artists.length} total · {artists.filter(a=>a.is_active).length} active · {artists.filter(a=>!a.is_active).length} inactive
            {loadingRevenue && <span style={{ color:'#93c5fd', marginLeft:8 }}>· Loading revenue...</span>}
          </p>
        </div>
        <a href="/admin/artists/new" style={{ padding:'10px 20px', background:'#2563eb', color:'#fff', borderRadius:10, fontFamily:mono, fontSize:11, letterSpacing:1.5, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 16px rgba(37,99,235,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ADD ARTIST
        </a>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' as const }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search artists..."
          style={{ padding:'8px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontFamily:mono, fontSize:11, outline:'none', width:220 }}/>
        {(['all','active','inactive'] as const).map(f=>(
          <button key={f} onClick={()=>setFilterStatus(f)} style={{ padding:'8px 14px', background:filterStatus===f?'rgba(37,99,235,0.2)':'rgba(255,255,255,0.04)', border:'1px solid '+(filterStatus===f?'rgba(37,99,235,0.4)':'rgba(255,255,255,0.1)'), borderRadius:8, color:filterStatus===f?'#93c5fd':'rgba(255,255,255,0.4)', fontFamily:mono, fontSize:10, cursor:'pointer', letterSpacing:1, textTransform:'uppercase' as const }}>
            {f}
          </button>
        ))}
      </div>

      <div style={card}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                {['Artist','Email','Status','Revenue','Streams','Actions'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'11px 16px', fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.3)', textTransform:'uppercase' as const, fontWeight:400, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(artist=>{
                const stats = revMap[artist.id]||{revenue:0,streams:0}
                const hasData = !!revMap[artist.id]
                return (
                  <tr key={artist.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.1s' }}>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, background:'linear-gradient(135deg,#2563eb,#06b6d4)', flexShrink:0, fontFamily:syne }}>{artist.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color:'#fff' }}>{artist.name}</div>
                          {artist.name_ar && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{artist.name_ar}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'13px 16px', fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.4)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{artist.email}</td>
                    <td style={{ padding:'13px 16px' }}>
                      <span style={{ fontFamily:mono, fontSize:9, padding:'3px 9px', borderRadius:6, border:'1px solid', letterSpacing:1, whiteSpace:'nowrap', ...(artist.is_active?{background:'rgba(34,197,94,0.08)',color:'#86efac',borderColor:'rgba(34,197,94,0.25)'}:{background:'rgba(239,68,68,0.08)',color:'#fca5a5',borderColor:'rgba(239,68,68,0.25)'}) }}>{artist.is_active?'● ACTIVE':'○ INACTIVE'}</span>
                    </td>
                    <td style={{ padding:'13px 16px', fontFamily:mono, fontSize:13, fontWeight:700, color: hasData?(stats.revenue>0?'#93c5fd':'rgba(255,255,255,0.3)'):'rgba(255,255,255,0.15)', whiteSpace:'nowrap' }}>
                      {loadingRevenue && !hasData ? <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11 }}>...</span> : '$'+stats.revenue.toFixed(2)}
                    </td>
                    <td style={{ padding:'13px 16px', fontFamily:mono, fontSize:12, color:'rgba(255,255,255,0.5)', whiteSpace:'nowrap' }}>
                      {loadingRevenue && !hasData ? <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11 }}>...</span> : stats.streams.toLocaleString()}
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <a href={`/admin/artists/${artist.id}`} style={{ fontFamily:mono, fontSize:10, color:'#93c5fd', textDecoration:'none', letterSpacing:1, display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:7 }}>
                        MANAGE →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length && <div style={{ padding:'48px', textAlign:'center', fontFamily:mono, fontSize:12, color:'rgba(255,255,255,0.2)' }}>
            {search ? 'No artists match your search' : 'No artists yet'}
          </div>}
        </div>
      </div>
    </AdminLayout>
  )
}
