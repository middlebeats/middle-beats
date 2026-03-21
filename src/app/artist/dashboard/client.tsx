'use client'
import { useState, useMemo } from 'react'
import { Artist, RoyaltyRecord, Notification, RoyaltyStatement } from '@/types'
import ArtistLayout from '@/components/artist/Layout'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const PAL = ['#3b82f6','#06b6d4','#8b5cf6','#f59e0b','#10b981','#ef4444','#ec4899','#84cc16']

const TOOLTIP_STYLE = {
  contentStyle: { background: '#071535', border: '1px solid #1a3080', borderRadius: 8, fontFamily: 'Space Mono' },
  labelStyle: { color: '#8da8d8', fontSize: 11 },
  itemStyle: { color: '#fff', fontSize: 11 },
}

interface Props {
  artist: Artist
  records: RoyaltyRecord[]
  notifications: Notification[]
  latestStatement: RoyaltyStatement | null
}

export default function ArtistDashboardClient({ artist, records, notifications, latestStatement }: Props) {
  const [activePeriod, setActivePeriod] = useState('all')

  const years = useMemo(() => [...new Set(records.map(r => r.year).filter(Boolean))].sort(), [records])

  const filtered = useMemo(() =>
    activePeriod === 'all' ? records : records.filter(r => r.year === activePeriod),
    [records, activePeriod]
  )

  const totalRevenue = filtered.reduce((s, r) => s + Number(r.revenue), 0)
  const totalStreams = filtered.reduce((s, r) => s + r.streams, 0)
  const platforms = new Set(filtered.map(r => r.platform)).size
  const countries = new Set(filtered.map(r => r.country)).size

  // Monthly trend
  const monthlyData = useMemo(() => {
    const m: Record<string, { revenue: number; streams: number }> = {}
    filtered.forEach(r => {
      if (!r.period) return
      if (!m[r.period]) m[r.period] = { revenue: 0, streams: 0 }
      m[r.period].revenue += Number(r.revenue)
      m[r.period].streams += r.streams
    })
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([p,v])=>({ period: p, ...v }))
  }, [filtered])

  // By platform
  const platformData = useMemo(() => {
    const m: Record<string, { revenue: number; streams: number }> = {}
    filtered.forEach(r => {
      if (!m[r.platform]) m[r.platform] = { revenue: 0, streams: 0 }
      m[r.platform].revenue += Number(r.revenue)
      m[r.platform].streams += r.streams
    })
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a,b)=>b.revenue-a.revenue).slice(0,8)
  }, [filtered])

  // Top tracks
  const topTracks = useMemo(() => {
    const m: Record<string, { revenue: number; streams: number }> = {}
    filtered.forEach(r => {
      const k = r.track_title || r.release_title || 'Unknown'
      if (!m[k]) m[k] = { revenue: 0, streams: 0 }
      m[k].revenue += Number(r.revenue)
      m[k].streams += r.streams
    })
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a,b)=>b.revenue-a.revenue).slice(0,10)
  }, [filtered])

  return (
    <ArtistLayout artist={artist} notifications={notifications} activePage="dashboard">
      {/* Period Filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="font-mono text-xs text-blue-300/50 tracking-widest uppercase">Period:</span>
        {['all', ...years].map(y => (
          <button key={y} onClick={() => setActivePeriod(y)}
            className={`px-4 py-1.5 rounded-full font-mono text-xs border transition-all ${
              activePeriod === y
                ? 'bg-blue-brand border-blue-brand text-white'
                : 'bg-navy-800 border-blue-sky/20 text-blue-300 hover:border-blue-sky/50'
            }`}>
            {y === 'all' ? 'All Time' : y}
          </button>
        ))}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, sub: 'All platforms', icon: '💰', color: 'text-sky-300' },
          { label: 'Total Streams', value: totalStreams.toLocaleString(), sub: 'All countries', icon: '🎧', color: 'text-white' },
          { label: 'Platforms', value: platforms, sub: `${countries} countries`, icon: '🏪', color: 'text-white' },
          { label: 'Records', value: filtered.length.toLocaleString(), sub: 'Data rows', icon: '📊', color: 'text-white' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="absolute right-4 top-4 text-2xl opacity-20">{k.icon}</div>
            <div className="font-mono text-xs tracking-widest text-blue-300/50 uppercase mb-2">{k.label}</div>
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
            <div className="font-mono text-xs text-blue-300/40 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Latest Statement Banner */}
      {latestStatement && (
        <div className="mb-6 p-4 rounded-xl border border-blue-sky/30 bg-blue-sky/5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="font-mono text-xs text-blue-300/60 uppercase tracking-widest">Latest Statement · </span>
            <span className="font-mono text-xs text-blue-300">{latestStatement.period}</span>
            <div className="text-lg font-bold text-sky-300 mt-0.5">${Number(latestStatement.total_revenue).toFixed(2)}</div>
          </div>
          <a href={`/artist/statements/${latestStatement.id}`}
            className="btn-ghost text-xs px-4 py-2">View Statement →</a>
        </div>
      )}

      {/* Revenue Trend */}
      <div className="card mb-6">
        <div className="px-6 py-4 border-b border-blue-sky/10">
          <h3 className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">Monthly Revenue</h3>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="period" tick={{ fill: '#5a7ab8', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#5a7ab8', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false}/>
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(4)}`, 'Revenue']}/>
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform + Tracks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Platform */}
        <div className="card">
          <div className="px-6 py-4 border-b border-blue-sky/10">
            <h3 className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">Revenue by Platform</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={platformData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                  {platformData.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]}/>)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(4)}`, 'Revenue']}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: 'Space Mono', fontSize: 10, color: '#8da8d8' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Tracks */}
        <div className="card">
          <div className="px-6 py-4 border-b border-blue-sky/10">
            <h3 className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">Top Tracks</h3>
          </div>
          <div className="divide-y divide-blue-sky/5">
            {topTracks.slice(0, 6).map((track, i) => {
              const maxRev = topTracks[0].revenue
              const pct = Math.round((track.revenue / maxRev) * 100)
              return (
                <div key={track.name} className="flex items-center gap-3 px-6 py-3 hover:bg-blue-sky/3 transition-colors">
                  <span className="font-mono text-xs text-blue-300/40 w-5 text-right">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{track.name}</div>
                    <div className="h-1 bg-blue-sky/10 rounded mt-1.5">
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: PAL[i % PAL.length] }}/>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs text-sky-300 font-bold">${track.revenue.toFixed(4)}</div>
                    <div className="font-mono text-xs text-blue-300/40">{track.streams.toLocaleString()} streams</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Streams Trend */}
      <div className="card">
        <div className="px-6 py-4 border-b border-blue-sky/10">
          <h3 className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">Monthly Streams</h3>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="period" tick={{ fill: '#5a7ab8', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#5a7ab8', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false}/>
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), 'Streams']}/>
              <Bar dataKey="streams" fill="#06b6d4" opacity={0.8} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ArtistLayout>
  )
}
