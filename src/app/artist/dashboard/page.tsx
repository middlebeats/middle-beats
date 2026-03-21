'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ArtistDashboardClient from './client'

export default function ArtistDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role === 'admin') { window.location.href = '/admin/dashboard'; return }

      const { data: artist } = await supabase.from('artists').select('*').eq('user_id', session.user.id).single()
      if (!artist) { window.location.href = '/auth/login'; return }

      // Force fresh data
      const [{ data: records }, { data: notifications }, { data: latestStatement }] = await Promise.all([
        supabase.from('royalty_records').select('period,year,platform,country,streams,revenue,track_title,release_title,source').eq('artist_id', artist.id).order('period', { ascending: false }),
        supabase.from('notifications').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('royalty_statements').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }).limit(1).single().then(r => r),
      ])

      setData({ artist, records: records||[], notifications: notifications||[], latestStatement: latestStatement?.data||null })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#040e2b' }}>
      <div style={{ color:'rgba(125,163,252,0.5)', fontFamily:'monospace', fontSize:12, letterSpacing:3 }}>LOADING...</div>
    </div>
  )

  if (!data) return null

  return <ArtistDashboardClient {...data}/>
}
