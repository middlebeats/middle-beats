'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [revMap, setRevMap] = useState<Record<string,{revenue:number;streams:number}>>({})
  const [loading, setLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      setAdminEmail(session.user.email || '')

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { window.location.href = '/artist/dashboard'; return }

      const [{ data: artistData }, { data: revData }] = await Promise.all([
        supabase.from('artists').select('*').order('name'),
        supabase.from('royalty_records').select('artist_id, revenue, streams'),
      ])

      const map: Record<string,{revenue:number;streams:number}> = {}
      for (const r of (revData||[])) {
        if (!map[r.artist_id]) map[r.artist_id] = { revenue:0, streams:0 }
        map[r.artist_id].revenue += Number(r.revenue)
        map[r.artist_id].streams += r.streams
      }
      setArtists(artistData || [])
      setRevMap(map)
      setLoading(false)
    }
    load()
  }, [])

  async function logout() { await createClient().auth.signOut(); window.location.href = '/auth/login' }

  const LOGO_SRC = '/logo-white.png'
  const mono = "'DM Mono', monospace"
  const sans = "'Syne', sans-serif"

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#040e2b',color:'rgba(125,163,252,0.5)',fontFamily:mono,fontSize:12,letterSpacing:3}}>LOADING...</div>

  return (
    <div style={{minHeight:'100vh',background:'#040e2b',backgroundImage:'radial-gradient(ellipse 80% 50% at 80% -10%,rgba(18,68,204,0.3) 0%,transparent 60%)',fontFamily:sans}}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',height:64,borderBottom:'1px solid rgba(59,130,246,0.15)',background:'rgba(4,14,43,0.97)',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <a href="/admin/dashboard" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18,fontWeight:800,letterSpacing:3,color:'#fff',fontFamily:sans}}>MIDDLE <span style={{color:'#7dd3fc'}}>BEATS</span></span>
          </a>
          <span style={{fontSize:9,background:'rgba(59,130,246,0.15)',color:'#7eb8ff',padding:'3px 9px',borderRadius:4,fontFamily:mono,letterSpacing:3,border:'1px solid rgba(59,130,246,0.25)'}}>ADMIN</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{fontFamily:mono,fontSize:11,color:'rgba(125,163,252,0.35)',fontWeight:300}}>{adminEmail}</span>
          <button onClick={logout} style={{background:'transparent',border:'1px solid rgba(59,130,246,0.2)',borderRadius:8,padding:'6px 14px',color:'rgba(125,163,252,0.45)',fontFamily:mono,fontSize:10,cursor:'pointer',letterSpacing:2}}>SIGN OUT</button>
        </div>
      </header>
      <div style={{display:'flex',minHeight:'calc(100vh - 64px)'}}>
        <aside style={{width:220,borderRight:'1px solid rgba(59,130,246,0.1)',padding:'16px 0',background:'rgba(4,14,43,0.6)',flexShrink:0}}>
          {[{href:'/admin/dashboard',icon:'📊',label:'Dashboard'},{href:'/admin/artists',icon:'🎤',label:'Artists',active:true},{href:'/admin/upload',icon:'📂',label:'Upload Reports'},{href:'/admin/statements',icon:'💸',label:'Statements'}].map(item=>(
            <a key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 24px',fontSize:13,fontWeight:item.active?600:400,color:item.active?'#fff':'rgba(200,216,248,0.4)',textDecoration:'none',borderLeft:item.active?'2px solid #3b82f6':'2px solid transparent',background:item.active?'rgba(59,130,246,0.1)':'transparent',fontFamily:sans}}>
              <span>{item.icon}</span>{item.label}
            </a>
          ))}
        </aside>
        <main style={{flex:1,padding:'32px 36px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:16}}>
            <div>
              <h1 style={{fontSize:24,fontWeight:800,color:'#fff',margin:0}}>Artists</h1>
              <p style={{fontFamily:mono,fontSize:11,color:'rgba(125,163,252,0.4)',marginTop:4}}>{artists.length} total artists</p>
            </div>
            <a href="/admin/artists/new" style={{padding:'11px 24px',background:'linear-gradient(135deg,#1a55e8,#1244cc)',color:'#fff',borderRadius:10,fontFamily:mono,fontSize:11,letterSpacing:2,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 20px rgba(26,85,232,0.4)'}}>➕ ADD ARTIST</a>
          </div>
          <div style={{background:'rgba(7,21,53,1)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:16,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'rgba(10,29,71,0.8)',borderBottom:'1px solid rgba(59,130,246,0.1)'}}>
                    {['Artist','Email','Status','Revenue','Streams','Actions'].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'12px 20px',fontFamily:mono,fontSize:9,letterSpacing:2,color:'rgba(90,122,184,0.6)',textTransform:'uppercase',fontWeight:400}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {artists.map(artist=>{
                    const stats = revMap[artist.id]||{revenue:0,streams:0}
                    return (
                      <tr key={artist.id} style={{borderBottom:'1px solid rgba(59,130,246,0.06)'}}>
                        <td style={{padding:'14px 20px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <div style={{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,background:'linear-gradient(135deg,#1a55e8,#06b6d4)',flexShrink:0}}>{artist.name.charAt(0)}</div>
                            <div>
                              <div style={{fontWeight:600,fontSize:14,color:'#fff'}}>{artist.name}</div>
                              {artist.name_ar&&<div style={{fontFamily:mono,fontSize:11,color:'rgba(125,163,252,0.4)',marginTop:2}}>{artist.name_ar}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'14px 20px',fontFamily:mono,fontSize:11,color:'rgba(125,163,252,0.6)'}}>{artist.email}</td>
                        <td style={{padding:'14px 20px'}}>
                          <span style={{fontFamily:mono,fontSize:9,padding:'3px 10px',borderRadius:6,border:'1px solid',letterSpacing:1,...(artist.is_active?{background:'rgba(34,211,107,0.08)',color:'#22d36b',borderColor:'rgba(34,211,107,0.25)'}:{background:'rgba(255,80,80,0.08)',color:'#ff8080',borderColor:'rgba(255,80,80,0.25)'})}}>{artist.is_active?'● ACTIVE':'○ INACTIVE'}</span>
                        </td>
                        <td style={{padding:'14px 20px',fontFamily:mono,fontSize:13,fontWeight:700,color:'#7dd3fc'}}>${stats.revenue.toFixed(2)}</td>
                        <td style={{padding:'14px 20px',fontFamily:mono,fontSize:13,color:'#a5b4fc'}}>{stats.streams.toLocaleString()}</td>
                        <td style={{padding:'14px 20px'}}>
                          <a href={`/admin/artists/${artist.id}`} style={{fontFamily:mono,fontSize:11,color:'#60a5fa',textDecoration:'none',letterSpacing:1}}>MANAGE →</a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!artists.length&&<div style={{padding:'48px',textAlign:'center',fontFamily:mono,fontSize:12,color:'rgba(90,122,184,0.4)'}}>No artists yet · <a href="/admin/artists/new" style={{color:'#60a5fa'}}>Add your first artist</a></div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
