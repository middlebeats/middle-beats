'use client'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Signing in...')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setStatus('Error: ' + error.message); return }
      if (data?.user) {
        setStatus('Success! Loading...')
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        window.location.replace(profile?.role === 'admin' ? '/admin' : '/artist/dashboard')
      }
    } catch (err: any) {
      setStatus('Error: ' + err.message)
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#040e2b',padding:'0 20px'}}>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:40,color:'#fff',fontSize:28,fontWeight:800,letterSpacing:3}}>
          MIDDLE <span style={{color:'#7dd3fc'}}>BEATS</span>
        </div>
        <div style={{background:'rgba(7,21,53,0.95)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:16,padding:32}}>
          <h1 style={{color:'#fff',fontSize:20,fontWeight:700,marginBottom:24}}>Sign In</h1>
          {status && <div style={{padding:'10px 14px',marginBottom:16,borderRadius:8,background:status.includes('Error')?'rgba(255,70,70,0.1)':'rgba(59,130,246,0.1)',color:status.includes('Error')?'#ff7070':'#7dd3fc',fontSize:12,fontFamily:'monospace'}}>{status}</div>}
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="Email address"
                style={{width:'100%',padding:'12px 16px',background:'rgba(10,29,71,0.8)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:10,color:'#fff',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:24}}>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Password"
                style={{width:'100%',padding:'12px 16px',background:'rgba(10,29,71,0.8)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:10,color:'#fff',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <button type="submit" style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,#1a55e8,#1244cc)',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',letterSpacing:2}}>
              SIGN IN →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
