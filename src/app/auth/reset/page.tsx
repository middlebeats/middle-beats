'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => { window.location.href = '/auth/login' }, 3000)
  }

  const inp: React.CSSProperties = { width:'100%',background:'rgba(10,29,71,0.8)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:10,padding:'12px 16px',color:'#fff',fontSize:14,fontFamily:'monospace',outline:'none',boxSizing:'border-box' }
  const lbl: React.CSSProperties = { display:'block',fontFamily:'monospace',fontSize:10,letterSpacing:3,color:'rgba(125,163,252,0.6)',textTransform:'uppercase',marginBottom:8 }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#040e2b',backgroundImage:'radial-gradient(ellipse 80% 50% at 70% 0%,rgba(18,68,204,0.4) 0%,transparent 60%)' }}>
      <div style={{ width:'100%',maxWidth:420,padding:'0 20px' }}>
        <div style={{ textAlign:'center',marginBottom:40 }}>
          <div style={{ fontFamily:'sans-serif',fontSize:32,fontWeight:800,letterSpacing:2,color:'#fff' }}>
            MIDDLE <span style={{ color:'#7dd3fc' }}>BEATS</span>
          </div>
          <p style={{ color:'rgba(125,163,252,0.5)',fontSize:11,letterSpacing:4,marginTop:8,fontFamily:'monospace' }}>ARTIST PORTAL</p>
        </div>
        <div style={{ background:'rgba(7,21,53,0.9)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:16,padding:32 }}>
          {done ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48,marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:8,color:'#fff' }}>Password Updated</h2>
              <p style={{ color:'rgba(125,163,252,0.5)',fontSize:12,fontFamily:'monospace' }}>Redirecting to login…</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize:22,fontWeight:700,marginBottom:4,color:'#fff' }}>Set New Password</h1>
              <p style={{ color:'rgba(125,163,252,0.5)',fontSize:12,marginBottom:24,fontFamily:'monospace' }}>Choose a strong password for your account</p>
              {error && <div style={{ background:'rgba(255,80,80,0.1)',border:'1px solid rgba(255,80,80,0.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'#ff8080',fontSize:12,fontFamily:'monospace' }}>{error}</div>}
              <form onSubmit={handleReset}>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>New Password</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" style={inp}/>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={lbl}>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required placeholder="Repeat password" style={inp}/>
                </div>
                <button type="submit" disabled={loading} style={{ width:'100%',background:'linear-gradient(135deg,#1a55e8,#1244cc)',color:'#fff',border:'none',borderRadius:10,padding:'13px 0',fontSize:12,fontFamily:'monospace',letterSpacing:2,fontWeight:700,textTransform:'uppercase',cursor:'pointer' }}>
                  {loading ? 'UPDATING…' : 'UPDATE PASSWORD'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
