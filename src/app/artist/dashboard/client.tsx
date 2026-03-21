'use client'
import { useState, useMemo } from 'react'
import { Artist, RoyaltyRecord, Notification, RoyaltyStatement } from '@/types'
import ArtistLayout from '@/components/artist/Layout'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const PAL = ['#3b82f6','#06b6d4','#8b5cf6','#f59e0b','#10b981','#ef4444','#ec4899','#84cc16','#f97316','#14b8a6']
const TT = {
  contentStyle:{background:'#071535',border:'1px solid #1a3080',borderRadius:8,fontFamily:'Space Mono,monospace',fontSize:11},
  labelStyle:{color:'#8da8d8'},itemStyle:{color:'#fff'}
}

interface Props {
  artist: Artist
  records: RoyaltyRecord[]
  notifications: Notification[]
  latestStatement: RoyaltyStatement | null
}

function agg(records: RoyaltyRecord[], key: keyof RoyaltyRecord) {
  const m: Record<string, {rev:number;plays:number}> = {}
  records.forEach(r => {
    const k = String(r[key] || 'Unknown')
    if (!m[k]) m[k] = {rev:0, plays:0}
    m[k].rev += Number(r.revenue)
    m[k].plays += r.streams
  })
  return Object.entries(m).map(([name,v]) => ({name,...v})).sort((a,b) => b.rev-a.rev)
}

export default function ArtistDashboardClient({ artist, records, notifications, latestStatement }: Props) {
  const [activeYear, setActiveYear] = useState('all')
  const [activeTab, setActiveTab] = useState<'overview'|'platforms'|'countries'|'tracks'|'trends'>('overview')

  const years = useMemo(() => [...new Set(records.map(r => r.year).filter(Boolean))].sort(), [records])
  const filtered = useMemo(() =>
    activeYear === 'all' ? records : records.filter(r => r.year === activeYear), [records, activeYear])

  const totalRev = filtered.reduce((s,r) => s+Number(r.revenue), 0)
  const totalStreams = filtered.reduce((s,r) => s+r.streams, 0)
  const platforms = new Set(filtered.map(r=>r.platform)).size
  const countries = new Set(filtered.map(r=>r.country)).size
  const months = new Set(filtered.map(r=>r.period)).size

  const byMonth = useMemo(() => {
    const m: Record<string,{rev:number;plays:number}> = {}
    filtered.forEach(r => {
      if(!r.period) return
      if(!m[r.period]) m[r.period] = {rev:0,plays:0}
      m[r.period].rev += Number(r.revenue)
      m[r.period].plays += r.streams
    })
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([p,v])=>({period:p,revenue:+v.rev.toFixed(4),streams:v.plays}))
  }, [filtered])

  const byPlatform = useMemo(() => agg(filtered,'platform'), [filtered])
  const byCountry = useMemo(() => agg(filtered,'country'), [filtered])
  const byTrack = useMemo(() => agg(filtered,'track_title' as any), [filtered])
  const byYear = useMemo(() => {
    const m: Record<string,{rev:number;plays:number}> = {}
    records.forEach(r => {
      if(!r.year) return
      if(!m[r.year]) m[r.year] = {rev:0,plays:0}
      m[r.year].rev += Number(r.revenue)
      m[r.year].plays += r.streams
    })
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([y,v])=>({year:y,revenue:+v.rev.toFixed(4),streams:v.plays}))
  }, [records])

  const tabs = [
    {id:'overview',label:'Overview'},
    {id:'platforms',label:'Platforms'},
    {id:'countries',label:'Countries'},
    {id:'tracks',label:'Tracks'},
    {id:'trends',label:'Trends'},
  ] as const

  const RankList = ({items, valKey, color}: {items:{name:string;rev:number;plays:number}[]; valKey:'rev'|'plays'; color:string}) => (
    <div>
      {items.slice(0,10).map((item,i) => {
        const max = items[0]?.[valKey] || 1
        const pct = Math.round((item[valKey]/max)*100)
        return (
          <div key={item.name} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 22px',borderBottom:'1px solid rgba(59,130,246,0.06)'}}>
            <span style={{fontFamily:'Space Mono',fontSize:11,color:'rgba(90,122,184,1)',width:20,textAlign:'right'}}>{i+1}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name||'Unknown'}</div>
              <div style={{height:4,background:'rgba(59,130,246,0.1)',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:2,background:color,width:`${pct}%`}}/>
              </div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontFamily:'Space Mono',fontSize:12,color:'#7dd3fc',fontWeight:700}}>{valKey==='rev'?`$${item.rev.toFixed(4)}`:item.plays.toLocaleString()}</div>
              <div style={{fontFamily:'Space Mono',fontSize:10,color:'rgba(90,122,184,1)'}}>{valKey==='rev'?item.plays.toLocaleString()+' streams':'$'+item.rev.toFixed(4)}</div>
            </div>
          </div>
        )
      })}
      {!items.length && <div style={{padding:'32px',textAlign:'center',fontFamily:'Space Mono',fontSize:12,color:'rgba(90,122,184,0.5)'}}>No data yet</div>}
    </div>
  )

  const cardStyle = {background:'rgba(7,21,53,1)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:16,overflow:'hidden' as const}
  const headStyle = {padding:'16px 22px',borderBottom:'1px solid rgba(59,130,246,0.1)',fontFamily:'Space Mono',fontSize:10,letterSpacing:2,color:'rgba(200,216,248,0.7)',textTransform:'uppercase' as const}

  return (
    <ArtistLayout artist={artist} notifications={notifications} activePage="dashboard">
      {/* Period Filter */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,flexWrap:'wrap' as const}}>
        <span style={{fontFamily:'Space Mono',fontSize:10,color:'rgba(90,122,184,0.6)',letterSpacing:3,textTransform:'uppercase' as const}}>Year:</span>
        {['all',...years].map(y => (
          <button key={y} onClick={()=>setActiveYear(y)} style={{
            padding:'5px 16px',borderRadius:20,fontFamily:'Space Mono',fontSize:11,cursor:'pointer',transition:'all 0.15s',
            background:activeYear===y?'#1244cc':'rgba(10,29,71,0.8)',
            border:activeYear===y?'1px solid #1244cc':'1px solid rgba(59,130,246,0.2)',
            color:activeYear===y?'#fff':'rgba(200,216,248,0.6)'
          }}>{y==='all'?'All Time':y}</button>
        ))}
      </div>

      {/* KPI Strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:24}}>
        {[
          {label:'Total Revenue',value:`$${totalRev.toFixed(2)}`,sub:'USD',icon:'💰',color:'#7dd3fc'},
          {label:'Total Streams',value:totalStreams.toLocaleString(),sub:'All platforms',icon:'🎧',color:'#fff'},
          {label:'Stores',value:platforms,sub:`${countries} countries`,icon:'🏪',color:'#fff'},
          {label:'Active Months',value:months,sub:'Reporting periods',icon:'📅',color:'#fff'},
          {label:'Avg per Month',value:`$${months>0?(totalRev/months).toFixed(2):'0.00'}`,sub:'Monthly avg',icon:'📈',color:'#a5f3fc'},
        ].map(k => (
          <div key={k.label} style={{...cardStyle,padding:'18px 20px',position:'relative' as const}}>
            <div style={{position:'absolute' as const,right:14,top:14,fontSize:20,opacity:0.2}}>{k.icon}</div>
            <div style={{fontFamily:'Space Mono',fontSize:9,letterSpacing:2,color:'rgba(90,122,184,0.7)',textTransform:'uppercase' as const,marginBottom:10}}>{k.label}</div>
            <div style={{fontSize:26,fontWeight:800,color:k.color,lineHeight:1}}>{k.value}</div>
            <div style={{fontFamily:'Space Mono',fontSize:10,color:'rgba(90,122,184,0.5)',marginTop:5}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Latest Statement Banner */}
      {latestStatement && (
        <div style={{marginBottom:24,padding:'14px 20px',borderRadius:12,border:'1px solid rgba(59,130,246,0.3)',background:'rgba(59,130,246,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:12}}>
          <div>
            <span style={{fontFamily:'Space Mono',fontSize:10,color:'rgba(90,122,184,0.6)',letterSpacing:2}}>LATEST STATEMENT · {latestStatement.period}</span>
            <div style={{fontSize:20,fontWeight:800,color:'#7dd3fc',marginTop:2}}>${Number(latestStatement.total_revenue).toFixed(2)}</div>
          </div>
          <a href={`/artist/statements`} style={{background:'rgba(18,68,204,0.3)',border:'1px solid rgba(59,130,246,0.35)',borderRadius:8,padding:'8px 18px',fontFamily:'Space Mono',fontSize:11,color:'#7eb8ff',textDecoration:'none',letterSpacing:1}}>VIEW →</a>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(59,130,246,0.15)',marginBottom:24,flexWrap:'wrap' as const}}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:'10px 20px',fontFamily:'Space Mono',fontSize:11,letterSpacing:1,cursor:'pointer',
            background:'transparent',border:'none',borderBottom:activeTab===t.id?'2px solid #3b82f6':'2px solid transparent',
            color:activeTab===t.id?'#fff':'rgba(90,122,184,0.6)',transition:'all 0.15s',textTransform:'uppercase' as const
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            <div style={cardStyle}>
              <div style={headStyle}>Revenue by Platform</div>
              <div style={{padding:20}}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byPlatform.slice(0,8)} dataKey="rev" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                      {byPlatform.slice(0,8).map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                    </Pie>
                    <Tooltip {...TT} formatter={(v:number)=>[`$${v.toFixed(4)}`,'Revenue']}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontFamily:'Space Mono',fontSize:10,color:'#8da8d8'}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={headStyle}>Top Countries</div>
              <div style={{padding:20}}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byCountry.slice(0,8)} layout="vertical">
                    <XAxis type="number" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false} width={30}/>
                    <Tooltip {...TT} formatter={(v:number)=>[`$${v.toFixed(4)}`,'Revenue']}/>
                    <Bar dataKey="rev" fill="rgba(16,185,129,0.75)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={headStyle}>Monthly Revenue</div>
            <div style={{padding:20}}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={byMonth}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                  <Tooltip {...TT} formatter={(v:number)=>[`$${v.toFixed(4)}`,'Revenue']}/>
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#rg)" strokeWidth={2} dot={{fill:'#3b82f6',r:3}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── PLATFORMS ── */}
      {activeTab==='platforms' && (
        <div>
          <div style={{...cardStyle,marginBottom:20}}>
            <div style={headStyle}>Revenue by Platform</div>
            <div style={{padding:20}}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byPlatform.slice(0,12)} layout="vertical">
                  <XAxis type="number" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fill:'#8da8d8',fontSize:11,fontFamily:'Space Mono'}} axisLine={false} tickLine={false} width={120}/>
                  <Tooltip {...TT} formatter={(v:number)=>[`$${v.toFixed(6)}`,'Revenue']}/>
                  <Bar dataKey="rev" fill="rgba(59,130,246,0.75)" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={headStyle}>Platform Rankings</div>
            <RankList items={byPlatform} valKey="rev" color="#3b82f6"/>
          </div>
        </div>
      )}

      {/* ── COUNTRIES ── */}
      {activeTab==='countries' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            <div style={cardStyle}>
              <div style={headStyle}>Revenue by Country</div>
              <div style={{padding:20}}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byCountry.slice(0,12)} layout="vertical">
                    <XAxis type="number" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:'#8da8d8',fontSize:11}} axisLine={false} tickLine={false} width={35}/>
                    <Tooltip {...TT} formatter={(v:number)=>[`$${v.toFixed(4)}`,'Revenue']}/>
                    <Bar dataKey="rev" fill="rgba(16,185,129,0.75)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={headStyle}>Streams by Country</div>
              <div style={{padding:20}}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byCountry.sort((a,b)=>b.plays-a.plays).slice(0,12)} layout="vertical">
                    <XAxis type="number" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:'#8da8d8',fontSize:11}} axisLine={false} tickLine={false} width={35}/>
                    <Tooltip {...TT} formatter={(v:number)=>[v.toLocaleString(),'Streams']}/>
                    <Bar dataKey="plays" fill="rgba(139,92,246,0.75)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={headStyle}>Country Rankings</div>
            <RankList items={byCountry} valKey="rev" color="#10b981"/>
          </div>
        </div>
      )}

      {/* ── TRACKS ── */}
      {activeTab==='tracks' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            <div style={cardStyle}>
              <div style={headStyle}>Top Tracks by Revenue</div>
              <RankList items={byTrack} valKey="rev" color="#8b5cf6"/>
            </div>
            <div style={cardStyle}>
              <div style={headStyle}>Top Tracks by Streams</div>
              <RankList items={[...byTrack].sort((a,b)=>b.plays-a.plays)} valKey="plays" color="#06b6d4"/>
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDS ── */}
      {activeTab==='trends' && (
        <div>
          <div style={{...cardStyle,marginBottom:20}}>
            <div style={headStyle}>Monthly Revenue Trend</div>
            <div style={{padding:20}}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={byMonth}>
                  <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="period" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                  <Tooltip {...TT} formatter={(v:number)=>[`$${v.toFixed(4)}`,'Revenue']}/>
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#rg2)" strokeWidth={2} dot={{fill:'#3b82f6',r:3}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{...cardStyle,marginBottom:20}}>
            <div style={headStyle}>Monthly Streams Trend</div>
            <div style={{padding:20}}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byMonth}>
                  <XAxis dataKey="period" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                  <Tooltip {...TT} formatter={(v:number)=>[v.toLocaleString(),'Streams']}/>
                  <Bar dataKey="streams" fill="rgba(6,182,212,0.75)" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div style={cardStyle}>
              <div style={headStyle}>Revenue by Year</div>
              <div style={{padding:20}}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byYear}>
                    <XAxis dataKey="year" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <Tooltip {...TT} formatter={(v:number)=>[`$${v.toFixed(4)}`,'Revenue']}/>
                    <Bar dataKey="revenue" fill="rgba(59,130,246,0.75)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={headStyle}>Streams by Year</div>
              <div style={{padding:20}}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byYear}>
                    <XAxis dataKey="year" tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#4a6a9a',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <Tooltip {...TT} formatter={(v:number)=>[v.toLocaleString(),'Streams']}/>
                    <Bar dataKey="streams" fill="rgba(139,92,246,0.75)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </ArtistLayout>
  )
}
