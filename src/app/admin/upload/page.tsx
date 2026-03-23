'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin/Layout'
import { useAdminAuth } from '@/lib/useAdminAuth'

const mono = "'DM Mono',monospace"
const syne = "'Syne',sans-serif"
const sans = "'DM Sans',sans-serif"

interface UploadResult {
  filename: string; source: string; rowCount: number
  matched: number; unmatched: string[]; autoCreated?: string[]; error?: string; duplicate?: boolean
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [results, setResults] = useState<UploadResult[]>([])
  const [token, setToken] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  const auth = useAdminAuth()
  useEffect(() => {
    if (!auth.ready) return
    setToken(auth.token)
  }, [auth.ready, auth.token])

  function handleFiles(fl: FileList | null) {
    if (!fl) return
    const csvs = Array.from(fl).filter(f => f.name.toLowerCase().endsWith('.csv'))
    setFiles(prev => { const ex = new Set(prev.map(f=>f.name)); return [...prev, ...csvs.filter(f=>!ex.has(f.name))] })
  }

  async function handleUpload() {
    if (!files.length || !token) return
    setUploading(true); setResults([])
    const newResults: UploadResult[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress(Math.round((i/files.length)*100))
      setCurrentFile(files[i].name)
      const formData = new FormData()
      formData.append('file', files[i])
      try {
        const res = await fetch('/api/admin/upload-report', {
          method:'POST',
          headers:{ 'Authorization':'Bearer '+token },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) newResults.push({ filename:files[i].name, source:'error', rowCount:0, matched:0, unmatched:[], error:data.error||'HTTP '+res.status, duplicate:data.duplicate||false })
        else newResults.push({ filename:files[i].name, ...data })
      } catch(e:any) {
        newResults.push({ filename:files[i].name, source:'error', rowCount:0, matched:0, unmatched:[], error:e.message })
      }
      setResults([...newResults])
    }
    setProgress(100); setCurrentFile(''); setFiles([]); setUploading(false)
  }

  async function handleDeleteAll() {
    setDeleting(true)
    setDeleteMsg('')
    try {
      const res = await fetch('/api/admin/delete-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteMsg('Error: ' + (data.error || 'Failed'))
      } else {
        setDeleteMsg(`✅ Deleted ${data.uploads} uploads and ${data.records} records`)
        setResults([])
      }
    } catch(e: any) {
      setDeleteMsg('Error: ' + e.message)
    }
    setDeleting(false)
    setShowDeleteModal(false)
  }

  const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }

  return (
    <AdminLayout activePage="upload" adminEmail={auth.email}>
      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
          onClick={()=>setShowDeleteModal(false)}>
          <div style={{ background:'#0d1b3e', border:'1px solid rgba(239,68,68,0.3)', borderRadius:16, padding:28, width:'100%', maxWidth:420 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(239,68,68,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:'#fff', fontFamily:"'Syne',sans-serif" }}>Delete All Reports</h3>
                <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:3, fontFamily:"'DM Mono',monospace" }}>This cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:24, fontFamily:"'DM Sans',sans-serif" }}>
              This will permanently delete <strong style={{color:'#fca5a5'}}>all uploaded reports</strong> and <strong style={{color:'#fca5a5'}}>all royalty records</strong>. Artist accounts will be kept. You will need to re-upload all CSV files.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleDeleteAll} disabled={deleting}
                style={{ flex:1, padding:'11px', background:'rgba(239,68,68,0.8)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:deleting?'not-allowed':'pointer', opacity:deleting?0.7:1 }}>
                {deleting ? 'Deleting...' : '🗑 Yes, Delete Everything'}
              </button>
              <button onClick={()=>setShowDeleteModal(false)}
                style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, fontSize:13, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ maxWidth:720 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:0, fontFamily:syne }}>Upload Reports</h1>
          <p style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4, letterSpacing:1 }}>Supports Other Music Platforms & Anghami CSV formats</p>
          {deleteMsg && (
            <div style={{ marginTop:10, padding:'8px 14px', borderRadius:8, fontFamily:mono, fontSize:12,
              background:deleteMsg.startsWith('✅')?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',
              border:'1px solid '+(deleteMsg.startsWith('✅')?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'),
              color:deleteMsg.startsWith('✅')?'#86efac':'#fca5a5', display:'inline-block' }}>
              {deleteMsg}
            </div>
          )}
        </div>
        <button onClick={()=>setShowDeleteModal(true)} disabled={!token}
          style={{ padding:'9px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, color:'#fca5a5', fontFamily:mono, fontSize:10, letterSpacing:1, cursor:'pointer', display:'flex', alignItems:'center', gap:8, height:'fit-content', whiteSpace:'nowrap', flexShrink:0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          DELETE ALL REPORTS
        </div>

        </button>

        {/* Supported formats info */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {[
            { name:'Other Music Platforms', cols:'sale_date, release_title, channel, country, units, total', color:'#93c5fd' },
            { name:'Anghami', cols:'Country, Song Name, Artist Name, Times Played, Period, Revenue', color:'#fca5a5' },
          ].map(f=>(
            <div key={f.name} style={{ ...card, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:f.color }}/>
                <span style={{ fontFamily:mono, fontSize:10, fontWeight:600, color:f.color, letterSpacing:1 }}>{f.name.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.3)', lineHeight:1.6 }}>{f.cols}</div>
            </div>
          ))}
        </div>

        <input type="file" id="csvInput" multiple accept=".csv" style={{ display:'none' }} onChange={e=>handleFiles(e.target.files)}/>
        <div
          style={{ border:'2px dashed '+(dragOver?'rgba(37,99,235,0.6)':'rgba(255,255,255,0.1)'), borderRadius:16, padding:'40px 32px', textAlign:'center', cursor:'pointer', marginBottom:20, background:dragOver?'rgba(37,99,235,0.05)':'transparent', transition:'all 0.2s' }}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files)}}
          onClick={()=>document.getElementById('csvInput')?.click()}>
          <div style={{ fontSize:36, marginBottom:12 }}>📂</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:6, fontFamily:syne }}>Drop CSV files here</div>
          <div style={{ fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.3)' }}>or click to browse</div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ ...card, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:2 }}>{files.length} FILE{files.length>1?'S':''} QUEUED</span>
              <button onClick={()=>setFiles([])} style={{ background:'transparent', border:'none', color:'rgba(239,68,68,0.6)', fontFamily:mono, fontSize:10, cursor:'pointer' }}>Clear all</button>
            </div>
            {files.map((f,i)=>(
              <div key={f.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize:16 }}>📄</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.75)' }}>{f.name}</div>
                  <div style={{ fontFamily:mono, fontSize:9, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{(f.size/1024).toFixed(1)} KB</div>
                </div>
                <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, width:26, height:26, color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>
              <span>{currentFile || 'Processing...'}</span><span>{progress}%</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
              <div style={{ height:'100%', background:'#2563eb', borderRadius:2, width:progress+'%', transition:'width 0.3s' }}/>
            </div>
          </div>
        )}

        <button onClick={handleUpload} disabled={!files.length||uploading||!token}
          style={{ padding:'12px 28px', background:(!files.length||uploading)?'rgba(37,99,235,0.2)':'#2563eb', color:'#fff', border:'none', borderRadius:10, fontFamily:mono, fontSize:11, letterSpacing:2, fontWeight:700, cursor:(!files.length||uploading)?'not-allowed':'pointer', textTransform:'uppercase' as const, marginBottom:28, boxShadow:(!files.length||uploading)?'none':'0 4px 20px rgba(37,99,235,0.4)' }}>
          {uploading ? 'Processing...' : `⚡ Upload ${files.length||''} Report${files.length!==1?'s':''}`}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div style={card}>
            <div style={{ padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', fontFamily:mono, fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const }}>Upload Results</div>
            {results.map(r=>(
              <div key={r.filename} style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:(r.unmatched?.length||r.error||r.autoCreated?.length)?8:0 }}>
                  <span style={{ fontSize:15, marginTop:1 }}>{r.error?(r.duplicate?'🔁':'❌'):r.matched>0?'✅':'⚠️'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:mono, fontSize:11, color:'rgba(255,255,255,0.85)', fontWeight:700 }}>{r.filename}</div>
                    {!r.error && <div style={{ fontFamily:mono, fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:3 }}>{r.rowCount} rows · {r.matched} matched · {r.source}</div>}
                    {r.error && <div style={{ fontFamily:mono, fontSize:10, color:r.duplicate?'#fde68a':'#fca5a5', marginTop:3 }}>{r.error}</div>}
                  </div>
                  {!r.error && <span style={{ fontFamily:mono, fontSize:8, padding:'2px 7px', borderRadius:4, background:r.source==='anghami'?'rgba(239,68,68,0.1)':'rgba(37,99,235,0.1)', color:r.source==='anghami'?'#fca5a5':'#93c5fd', border:'1px solid '+(r.source==='anghami'?'rgba(239,68,68,0.2)':'rgba(37,99,235,0.2)'), letterSpacing:0.5 }}>{r.source==='anghami'?'ANGHAMI':'PLATFORM'}</span>}
                </div>
                {r.autoCreated?.length>0 && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)', color:'#86efac', fontSize:11, fontFamily:mono, marginLeft:26 }}>✨ Auto-created: {r.autoCreated.join(', ')}</div>}
                {r.unmatched?.length>0 && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', color:'#fde68a', fontSize:11, fontFamily:mono, marginLeft:26, marginTop:6 }}>⚠️ Still unmatched: {r.unmatched.join(', ')}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
