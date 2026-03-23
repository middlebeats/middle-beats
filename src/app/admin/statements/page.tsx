'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin/Layout'

const mono = "'DM Mono',monospace"
const syne = "'Syne',sans-serif"
const sans = "'DM Sans',sans-serif"

export default function StatementsPage() {
  const [adminEmail, setAdminEmail] = useState('')
  const [token, setToken] = useState('')
  const [artists, setArtists] = useState<any[]>([])
  const [statements, setStatements] = useState<any[]>([])
  const [periods, setPeriods] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState<{text:string;type:'ok'|'err'}|null>(null)
  const [selectedArtist, setSelectedArtist] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { window.location.href = '/artist/dashboard'; return }
      setAdminEmail(session.user.email || '')
      setToken(session.access_token)

      const [{ data: artistData }, { data: stmtData }, { data: periodData }] = await Promise.all([
        supabase.from('artists').select('id,name,email').eq('is_active', true).order('name'),
        supabase.from('royalty_statements').select('*,artists(name,email)').order('created_at',{ascending:false}).limit(100),
        supabase.from('royalty_records').select('period').order('period',{ascending:false}).limit(1000),
      ])

      setArtists(artistData||[])
      setStatements(stmtData||[])
      const uniquePeriods = [...new Set((periodData||[]).map((r:any)=>r.period).filter(Boolean))] as string[]
      setPeriods(uniquePeriods.slice(0,24))
      if (uniquePeriods.length) setSelectedPeriod(uniquePeriods[0])
      setLoading(false)
    }
    load()
  }, [])

  async function generateStatements() {
    if (!selectedPeriod) { setMsg({text:'Please select a period',type:'err'}); return }
    setGenerating(true); setMsg(null)
    const res = await fetch('/api/admin/generate-statements', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({ period:selectedPeriod, artistId: selectedArtist==='all'?null:selectedArtist }),
    })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setMsg({text:data.error||'Failed',type:'err'}); return }
    setMsg({text:`✅ Generated ${data.count||1} statement(s) for ${selectedPeriod}`,type:'ok'})
    // Reload statements
    const supabase = createClient()
    const { data: newStmts } = await supabase.from('royalty_statements').select('*,artists(name,email)').order('created_at',{ascending:false}).limit(100)
    setStatements(newStmts||[])
  }

  const filtered = statements.filter(s => {
    if (filter && !s.artists?.name?.toLowerCase().includes(filter.toLowerCase()) && !s.period?.includes(filter)) return false
    return true
  })

  const statusColor = (s:string) => s==='paid'?{bg:'rgba(34,197,94,0.1)',text:'#86efac',border:'rgba(34,197,94,0.2)'}:s==='sent'?{bg:'rgba(37,99,235,0.1)',text:'#93c5fd',border:'rgba(37,99,235,0.2)'}:{bg:'rgba(234,179,8,0.1)',text:'#fde68a',border:'rgba(234,179,8,0.2)'}
  const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }

  if (loading) return (
    <AdminLayout activePage="statements" adminEmail={adminEmail}>
      <div style={{ padding:40, textAlign:'center', fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:2 }}>LOADING...</div>
    </AdminLayout>
  )

  return (
    <AdminLayout activePage="statements" adminEmail={adminEmail}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:0, fontFamily:syne }}>Royalty Statements</h1>
        <p style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4, letterSpacing:1 }}>Generate and manage artist royalty statements</p>
      </div>

      {/* Generate panel */}
      <div style={{ ...card, padding:'20px 22px', marginBottom:22 }}>
        <div style={{ fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const, marginBottom:16 }}>Generate New Statement</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' as const, alignItems:'flex-end' }}>
          <div>
            <label style={{ display:'block', fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:6, textTransform:'uppercase' as const }}>Period</label>
            <select value={selectedPeriod} onChange={e=>setSelectedPeriod(e.target.value)}
              style={{ padding:'9px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontFamily:mono, fontSize:12, outline:'none', minWidth:130 }}>
              <option value="">Select period</option>
              {periods.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:6, textTransform:'uppercase' as const }}>Artist</label>
            <select value={selectedArtist} onChange={e=>setSelectedArtist(e.target.value)}
              style={{ padding:'9px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontFamily:mono, fontSize:12, outline:'none', minWidth:180 }}>
              <option value="all">All Active Artists</option>
              {artists.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={generateStatements} disabled={generating||!selectedPeriod}
            style={{ padding:'10px 24px', background:generating?'rgba(37,99,235,0.2)':'#2563eb', color:'#fff', border:'none', borderRadius:10, fontFamily:mono, fontSize:11, letterSpacing:1, cursor:generating?'not-allowed':'pointer', fontWeight:700, boxShadow:generating?'none':'0 4px 16px rgba(37,99,235,0.3)', height:38 }}>
            {generating?'Generating...':'⚡ Generate'}
          </button>
        </div>
        {msg && (
          <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, fontFamily:mono, fontSize:12,
            background:msg.type==='err'?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)',
            border:'1px solid '+(msg.type==='err'?'rgba(239,68,68,0.3)':'rgba(34,197,94,0.3)'),
            color:msg.type==='err'?'#fca5a5':'#86efac' }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Statements table */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexWrap:'wrap' as const, gap:10 }}>
          <span style={{ fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const }}>{filtered.length} Statements</span>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search by artist or period..."
            style={{ padding:'7px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontFamily:mono, fontSize:11, outline:'none', width:220 }}/>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                {['Artist','Period','Revenue','Status','Created','Actions'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.3)', textTransform:'uppercase' as const, fontWeight:400, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s=>{
                const sc = statusColor(s.status||'pending')
                return (
                  <tr key={s.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'#fff' }}>{s.artists?.name||'Unknown'}</div>
                      <div style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{s.artists?.email}</div>
                    </td>
                    <td style={{ padding:'13px 16px', fontFamily:mono, fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{s.period}</td>
                    <td style={{ padding:'13px 16px', fontFamily:mono, fontSize:14, color:'#93c5fd', fontWeight:700 }}>${Number(s.total_revenue||0).toFixed(2)}</td>
                    <td style={{ padding:'13px 16px' }}>
                      <span style={{ fontFamily:mono, fontSize:9, padding:'3px 9px', borderRadius:6, background:sc.bg, color:sc.text, border:'1px solid '+sc.border, letterSpacing:1 }}>{(s.status||'pending').toUpperCase()}</span>
                    </td>
                    <td style={{ padding:'13px 16px', fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.3)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td style={{ padding:'13px 16px' }}>
                      <a href={`/admin/artists/${s.artist_id}`} style={{ fontFamily:mono, fontSize:10, color:'#93c5fd', textDecoration:'none', letterSpacing:1 }}>VIEW →</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length && <div style={{ padding:'40px', textAlign:'center' as const, fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.2)' }}>No statements yet — generate your first one above</div>}
        </div>
      </div>
    </AdminLayout>
  )
}
