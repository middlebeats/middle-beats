'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const NAV = [
  { section: 'Overview' },
  { key: 'dashboard',  label: 'Dashboard',    icon: '📊', href: '/admin' },
  { section: 'Management' },
  { key: 'artists',    label: 'Artists',       icon: '🎤', href: '/admin/artists' },
  { key: 'upload',     label: 'Upload Reports',icon: '📂', href: '/admin/upload' },
  { key: 'reports',    label: 'All Reports',   icon: '🗃️', href: '/admin/reports' },
  { section: 'Finance' },
  { key: 'statements', label: 'Statements',    icon: '💸', href: '/admin/statements' },
  { key: 'royalties',  label: 'Royalties',     icon: '💰', href: '/admin/royalties' },
]

interface Props {
  activePage: string
  children: React.ReactNode
  adminEmail?: string
}

export default function AdminLayout({ activePage, children, adminEmail }: Props) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    toast.success('Logged out')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#040e2b' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 border-b"
        style={{ background: 'rgba(4,14,43,0.97)', borderColor: 'rgba(59,130,246,0.2)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-4">
          <button className="lg:hidden text-blue-300" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div>
            <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
              MIDDLE<span style={{ color: '#7dd3fc' }}> BEATS</span>
            </span>
            <span className="ml-3 font-mono text-xs px-2 py-0.5 rounded"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#7eb8ff', border: '1px solid rgba(59,130,246,0.3)' }}>
              ADMIN
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-blue-300/50 hidden sm:block">{adminEmail}</span>
          <button onClick={handleLogout} className="font-mono text-xs text-blue-300/50 hover:text-blue-300 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className={`
          fixed lg:sticky top-16 h-[calc(100vh-4rem)] w-60 flex-shrink-0 z-40
          flex flex-col border-r overflow-y-auto transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `} style={{ background: 'rgba(4,14,43,0.85)', borderColor: 'rgba(59,130,246,0.12)' }}>
          <nav className="flex-1 py-4">
            {NAV.map((item, i) => {
              if ('section' in item) {
                return (
                  <div key={i} className="px-5 pt-5 pb-2">
                    <span className="font-mono text-xs tracking-widest text-blue-300/30 uppercase">{item.section}</span>
                  </div>
                )
              }
              return (
                <Link key={item.key} href={item.href!}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all border-l-2 ${
                    activePage === item.key
                      ? 'bg-blue-sky/10 text-white border-blue-sky'
                      : 'text-blue-300/60 border-transparent hover:bg-blue-sky/5 hover:text-white'
                  }`}>
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="p-5 border-t" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <div className="font-mono text-xs text-blue-300/30">Middle Beats Admin</div>
            <div className="font-mono text-xs text-green-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
              System operational
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)}/>
        )}

        <main className="flex-1 min-w-0 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
