'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ArtistDashboardClient from './client'

export default function ArtistDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState('Loading...')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      
      // Use getUser() for fresh server-verified auth - prevents stale session issues
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { window.location.href = '/auth/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'admin') { window.location.href = '/admin/dashboard'; return }

      const { data: artist } = await supabase.from('artists').select('*').eq('user_id', user.id).single()
      if (!artist) { window.location.href = '/auth/login'; return }

      setProgress('Fetching analytics...')

      // Paginate through ALL records — no 1000 row limit
      const allRecords: any[] = []
      const PAGE_SIZE = 1000
      let page = 0

      while (true) {
        const { data: chunk, error } = await supabase
          .from('royalty_records')
          .select('period,year,platform,country,streams,revenue,track_title,release_title,source')
          .eq('artist_id', artist.id)
          .order('period', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error || !chunk || chunk.length === 0) break
        allRecords.push(...chunk)
        setProgress(`Loading records... ${allRecords.length.toLocaleString()}`)
        if (chunk.length < PAGE_SIZE) break
        page++
      }

      setProgress('Done!')

      const [{ data: notifications }, latestStatementResult] = await Promise.all([
        supabase.from('notifications').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('royalty_statements').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }).limit(1).single(),
      ])

      setData({
        artist,
        records: allRecords,
        notifications: notifications || [],
        latestStatement: latestStatementResult?.data || null,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#040e2b' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ color:'rgba(125,163,252,0.6)', fontFamily:'monospace', fontSize:12, letterSpacing:3, marginBottom:8 }}>{progress}</div>
        <div style={{ width:200, height:2, background:'rgba(59,130,246,0.15)', borderRadius:2, margin:'0 auto' }}>
          <div style={{ height:'100%', background:'#3b82f6', borderRadius:2, width:'60%', animation:'pulse 1.5s ease-in-out infinite' }}/>
        </div>
      </div>
    </div>
  )

  if (!data) return null

  return <ArtistDashboardClient {...data}/>
}
