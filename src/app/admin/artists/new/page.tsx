'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewArtistPage() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name:'', name_ar:'', email:'', password:'', phone:'', bio:'' })
  const [msg, setMsg] = useState('')
  const [created, setCreated] = useState<{name:string;email:string;password:string}|null>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    let p = ''
    for (let i = 0; i < 12; i++) p += chars.charAt(Math.floor(Math.random() * chars.length))
    set('password', p)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setMsg('error:Name, email and password are required'); return }
    if (form.password.length < 8) { setMsg('error:Password must be at least 8 characters'); return }
    setLoading(true); setMsg('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      const res = await fetch('/api/admin/create-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setCreated({ name: form.name, email: form.email, password: form.password })
      setForm({ name:'', name_ar:'', email:'', password:'', phone:'', bio:'' })
      setMsg('success:Artist created successfully!')
    } catch (err: any) {
      setMsg('error:' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = { width:'100%', padding:'12px 16px', background:'rgba(7,21,53,0.8)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:10, color:'#fff', fontSize:14, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }
  const lbl: React.CSSProperties = { display:'block', fontFamily:'monospace', fontSize:10, letterSpacing:3, color:'rgba(125,163,252,0.6)', textTransform:'uppercase', marginBottom:8 }

  return (
    <div style={{ minHeight:'100vh', background:'#040e2b', padding:'32px' }}>
      <div style={{ maxWidth:700 }}>
        <a href="/admin/artists" style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.5)', textDecoration:'none' }}>← Back to Artists</a>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'16px 0 4px' }}>Add New Artist</h1>
        <p style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.4)', marginBottom:28 }}>Create login credentials for the artist to access their portal</p>

        {/* Success card with credentials */}
        {created && (
          <div style={{ background:'rgba(34,211,107,0.08)', border:'1px solid rgba(34,211,107,0.3)', borderRadius:14, padding:24, marginBottom:24 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#22d36b', marginBottom:12 }}>✅ Artist account created!</div>
            <p style={{ fontFamily:'monospace', fontSize:11, color:'rgba(34,211,107,0.7)', marginBottom:16 }}>Share these login credentials with the artist:</p>
            <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:10, padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.5)' }}>LOGIN URL</span>
                <span style={{ fontFamily:'monospace', fontSize:11, color:'#fff' }}>middle-beats.vercel.app/auth/login</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.5)' }}>EMAIL</span>
                <span style={{ fontFamily:'monospace', fontSize:11, color:'#fff' }}>{created.email}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0' }}>
                <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.5)' }}>PASSWORD</span>
                <span style={{ fontFamily:'monospace', fontSize:13, color:'#7dd3fc', fontWeight:700, letterSpacing:2 }}>{created.password}</span>
              </div>
            </div>
            <button onClick={()=>setCreated(null)} style={{ marginTop:12, background:'transparent', border:'1px solid rgba(34,211,107,0.3)', borderRadius:8, padding:'6px 16px', color:'rgba(34,211,107,0.7)', fontFamily:'monospace', fontSize:10, cursor:'pointer', letterSpacing:1 }}>
              ADD ANOTHER ARTIST
            </button>
          </div>
        )}

        {msg && !created && (
          <div style={{ padding:'12px 16px', marginBottom:20, borderRadius:8, fontFamily:'monospace', fontSize:12,
            background: msg.startsWith('error:') ? 'rgba(255,60,60,0.1)' : 'rgba(34,211,107,0.1)',
            border: '1px solid ' + (msg.startsWith('error:') ? 'rgba(255,60,60,0.3)' : 'rgba(34,211,107,0.3)'),
            color: msg.startsWith('error:') ? '#ff8080' : '#22d36b'
          }}>{msg.replace(/^(error|success):/, '')}</div>
        )}

        <div style={{ background:'rgba(7,21,53,1)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:16, padding:28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={lbl}>Artist Name (English) *</label>
                <input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Madeleine Matar" required/>
              </div>
              <div>
                <label style={lbl}>Artist Name (Arabic)</label>
                <input style={inp} value={form.name_ar} onChange={e=>set('name_ar',e.target.value)} placeholder="مادلين مطر" dir="rtl"/>
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Email Address *</label>
              <input style={inp} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="artistname@middle-beats.com" required/>
              <p style={{ fontFamily:'monospace', fontSize:10, color:'rgba(125,163,252,0.35)', marginTop:6 }}>Can use any email — the artist will use this to log in.</p>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Password *</label>
              <div style={{ display:'flex', gap:10 }}>
                <input style={{ ...inp, flex:1 }} type="text" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min 8 characters" required minLength={8}/>
                <button type="button" onClick={generatePassword} style={{ padding:'12px 16px', background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:10, color:'#7eb8ff', fontFamily:'monospace', fontSize:10, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:1 }}>
                  AUTO GENERATE
                </button>
              </div>
              <p style={{ fontFamily:'monospace', fontSize:10, color:'rgba(125,163,252,0.35)', marginTop:6 }}>You will see the password after creation to share with the artist.</p>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Phone (optional)</label>
              <input style={inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+961 xx xxx xxx"/>
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={lbl}>Bio (optional)</label>
              <textarea style={{ ...inp, height:80, resize:'none' as const }} value={form.bio} onChange={e=>set('bio',e.target.value)} placeholder="Short artist biography…"/>
            </div>

            <div style={{ display:'flex', gap:12 }}>
              <button type="submit" disabled={loading} style={{ padding:'12px 28px', background: loading?'rgba(26,85,232,0.4)':'linear-gradient(135deg,#1a55e8,#1244cc)', color:'#fff', border:'none', borderRadius:10, fontFamily:'monospace', fontSize:11, letterSpacing:2, fontWeight:700, cursor: loading?'not-allowed':'pointer', textTransform:'uppercase' as const }}>
                {loading ? 'CREATING…' : '✓ CREATE ARTIST ACCOUNT'}
              </button>
              <a href="/admin/artists" style={{ padding:'12px 20px', background:'transparent', color:'rgba(125,163,252,0.5)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:10, fontFamily:'monospace', fontSize:11, letterSpacing:1, textDecoration:'none', display:'flex', alignItems:'center' }}>Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
