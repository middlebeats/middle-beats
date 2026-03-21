'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'admin') router.push('/admin')
    else router.push('/artist/dashboard')
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setResetSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#040e2b',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 70% 0%,rgba(18,68,204,0.4) 0%,transparent 60%), radial-gradient(ellipse 60% 40% at 10% 100%,rgba(10,30,120,0.25) 0%,transparent 55%)'
      }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center">
            <span style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,letterSpacing:2,color:'#fff'}}>
              MIDDLE<span style={{color:'#7dd3fc'}}> BEATS</span>
            </span>
          </div>
          <p className="text-blue-300/50 font-mono text-xs tracking-widest mt-2 uppercase">Artist Portal</p>
        </div>

        {/* Card */}
        <div className="bg-navy-800/80 border border-blue-sky/20 rounded-2xl p-8 backdrop-blur-sm"
          style={{background:'rgba(7,21,53,0.8)'}}>
          {!showReset ? (
            <>
              <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
              <p className="text-blue-300/50 font-mono text-xs mb-8">Sign in to your account</p>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="label">Email address</label>
                  <input className="input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/>
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required/>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>
              </form>
              <button onClick={() => setShowReset(true)}
                className="w-full text-center mt-4 text-blue-300/50 hover:text-blue-300 font-mono text-xs transition-colors">
                Forgot password?
              </button>
            </>
          ) : resetSent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-blue-300/50 font-mono text-xs mb-6">We sent a reset link to {email}</p>
              <button onClick={() => { setShowReset(false); setResetSent(false) }}
                className="btn-ghost">Back to Login</button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1">Reset Password</h2>
              <p className="text-blue-300/50 font-mono text-xs mb-6">Enter your email to receive a reset link</p>
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="label">Email address</label>
                  <input className="input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => setShowReset(false)}
                className="w-full text-center mt-4 text-blue-300/50 hover:text-blue-300 font-mono text-xs transition-colors">
                Back to Login
              </button>
            </>
          )}
        </div>

        <p className="text-center text-blue-300/30 font-mono text-xs mt-6">
          © {new Date().getFullYear()} Middle Beats · All rights reserved
        </p>
      </div>
    </div>
  )
}
