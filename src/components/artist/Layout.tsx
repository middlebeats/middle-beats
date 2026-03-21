'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Artist, Notification } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  artist: Artist
  notifications: Notification[]
  activePage: string
  children: React.ReactNode
}

const NAV = [
  { key: 'dashboard',   label: 'Dashboard',   icon: '📊', href: '/artist/dashboard' },
  { key: 'tracks',      label: 'My Tracks',   icon: '🎵', href: '/artist/tracks' },
  { key: 'statements',  label: 'Statements',  icon: '💸', href: '/artist/statements' },
  { key: 'analytics',   label: 'Analytics',   icon: '📈', href: '/artist/analytics' },
]

export default function ArtistLayout({ artist, notifications, activePage, children }: Props) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const unread = notifications.filter(n => !n.is_read).length

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    toast.success('Logged out')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#040e2b' }}>
      {/* TOP NAV */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 border-b"
        style={{ background: 'rgba(4,14,43,0.95)', borderColor: 'rgba(59,130,246,0.2)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-4">
          <button className="lg:hidden text-blue-300" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
            MIDDLE<span style={{ color: '#7dd3fc' }}> BEATS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications bell */}
          <div className="relative">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-blue-300 hover:bg-blue-sky/10 transition-colors relative"
              style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
              🔔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-mono">
                  {unread}
                </span>
              )}
            </button>
          </div>
          {/* Artist name */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#1a55e8,#06b6d4)' }}>
              {artist.name.charAt(0)}
            </div>
            <span className="font-mono text-xs text-blue-300">{artist.name}</span>
          </div>
          <button onClick={handleLogout} className="font-mono text-xs text-blue-300/50 hover:text-blue-300 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className={`
          fixed lg:sticky top-16 h-[calc(100vh-4rem)] w-56 flex-shrink-0 z-40
          flex flex-col border-r overflow-y-auto transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `} style={{ background: 'rgba(4,14,43,0.8)', borderColor: 'rgba(59,130,246,0.12)' }}>
          <nav className="flex-1 py-6">
            <div className="px-5 mb-3">
              <span className="font-mono text-xs tracking-widest text-blue-300/40 uppercase">Menu</span>
            </div>
            {NAV.map(item => (
              <Link key={item.key} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all border-l-2 ${
                  activePage === item.key
                    ? 'bg-blue-sky/10 text-white border-blue-sky'
                    : 'text-blue-300/70 border-transparent hover:bg-blue-sky/5 hover:text-white'
                }`}>
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-5 border-t" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <div className="font-mono text-xs text-blue-300/40 mb-1">Artist Portal</div>
            <div className="font-semibold text-sm truncate">{artist.name}</div>
            {artist.name_ar && <div className="font-mono text-xs text-blue-300/50 mt-0.5">{artist.name_ar}</div>}
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}/>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 p-6 lg:p-8">
          {/* Notifications banner */}
          {notifications.filter(n => !n.is_read).slice(0, 1).map(n => (
            <div key={n.id} className="mb-6 p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="flex items-center gap-3">
                <span>{n.type === 'statement' ? '💸' : n.type === 'alert' ? '⚠️' : 'ℹ️'}</span>
                <div>
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="font-mono text-xs text-blue-300/60">{n.message}</div>
                </div>
              </div>
            </div>
          ))}
          {children}
        </main>
      </div>
    </div>
  )
}
