'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UploadResult {
  filename: string; source: string; rowCount: number; matched: number; unmatched: string[]
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<UploadResult[]>([])
  const [msg, setMsg] = useState('')

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const csvFiles = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.csv'))
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...csvFiles.filter(f => !existing.has(f.name))]
    })
  }

  async function handleUpload() {
    if (!files.length) return
    setUploading(true); setResults([]); setMsg('')
    const { data: { session } } = await createClient().auth.getSession()
    if (!session) { window.location.href = '/auth/login'; return }

    const newResults: UploadResult[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress(Math.round((i / files.length) * 100))
      const formData = new FormData()
      formData.append('file', files[i])
      try {
        const res = await fetch('/api/admin/upload-report', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        newResults.push({ filename: files[i].name, ...data })
        setMsg(`success:${files[i].name} processed`)
      } catch (err: any) {
        newResults.push({ filename: files[i].name, source: 'error', rowCount: 0, matched: 0, unmatched: [err.message] })
        setMsg(`error:${files[i].name}: ${err.message}`)
      }
    }
    setProgress(100); setResults(newResults); setFiles([]); setUploading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#040e2b', padding:'32px' }}>
      <div style={{ maxWidth:760 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>Upload Store Reports</h1>
        <p style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.4)', marginBottom:28 }}>Supports Other Music Platforms &amp; Anghami CSV formats</p>

        <input type="file" id="csvInput" multiple accept=".csv" style={{ display:'none' }} onChange={e=>handleFiles(e.target.files)}/>

        <div
          style={{ border:`2px dashed ${dragOver?'rgba(59,130,246,0.8)':'rgba(59,130,246,0.25)'}`, borderRadius:16, padding:'48px 32px', textAlign:'center', cursor:'pointer', marginBottom:20, background: dragOver?'rgba(59,130,246,0.08)':'rgba(18,68,204,0.03)', transition:'all 0.2s' }}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files)}}
          onClick={()=>document.getElementById('csvInput')?.click()}>
          <div style={{ fontSize:44, marginBottom:14 }}>📂</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#fff', marginBottom:6 }}>Drop CSV files here</div>
          <div style={{ fontFamily:'monospace', fontSize:12, color:'rgba(125,163,252,0.5)', marginBottom:16 }}>or click to browse</div>
          <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap' }}>
            {['Other Music Platforms', 'Anghami'].map(s => (
              <span key={s} style={{ fontFamily:'monospace', fontSize:11, padding:'3px 12px', borderRadius:20, border:'1px solid rgba(59,130,246,0.3)', color:'#7eb8ff' }}>{s}</span>
            ))}
          </div>
        </div>

        {files.length > 0 && (
          <div style={{ background:'rgba(7,21,53,1)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:12, marginBottom:20, overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid rgba(59,130,246,0.1)' }}>
              <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(200,216,248,0.6)', letterSpacing:2 }}>{files.length} FILE{files.length>1?'S':''} READY</span>
              <button onClick={()=>setFiles([])} style={{ background:'transparent', border:'none', color:'rgba(255,80,80,0.7)', fontFamily:'monospace', fontSize:11, cursor:'pointer' }}>Clear all</button>
            </div>
            {files.map((f,i) => (
              <div key={f.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:'1px solid rgba(59,130,246,0.06)' }}>
                <span>📄</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(200,216,248,0.8)' }}>{f.name}</div>
                  <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(90,122,184,0.5)' }}>{(f.size/1024).toFixed(1)} KB</div>
                </div>
                <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={{ background:'transparent', border:'none', color:'rgba(90,122,184,0.5)', cursor:'pointer', fontSize:16 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.5)', marginBottom:8 }}>
              <span>Processing…</span><span>{progress}%</span>
            </div>
            <div style={{ height:4, background:'rgba(59,130,246,0.15)', borderRadius:2 }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#1a55e8,#3b82f6)', borderRadius:2, width:`${progress}%`, transition:'width 0.4s' }}/>
            </div>
          </div>
        )}

        <button onClick={handleUpload} disabled={!files.length||uploading} style={{ padding:'12px 28px', background: (!files.length||uploading)?'rgba(26,85,232,0.3)':'linear-gradient(135deg,#1a55e8,#1244cc)', color:'#fff', border:'none', borderRadius:10, fontFamily:'monospace', fontSize:11, letterSpacing:2, fontWeight:700, cursor:(!files.length||uploading)?'not-allowed':'pointer', textTransform:'uppercase', marginBottom:28, boxShadow:(!files.length||uploading)?'none':'0 4px 20px rgba(26,85,232,0.4)' }}>
          {uploading ? 'Processing…' : `⚡ Process ${files.length||''} Report${files.length!==1?'s':''}`}
        </button>

        {results.length > 0 && (
          <div style={{ background:'rgba(7,21,53,1)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(59,130,246,0.1)', fontFamily:'monospace', fontSize:10, letterSpacing:2, color:'rgba(200,216,248,0.5)', textTransform:'uppercase' }}>Upload Results</div>
            {results.map(r => (
              <div key={r.filename} style={{ padding:'16px 20px', borderBottom:'1px solid rgba(59,130,246,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: r.unmatched?.length?8:0 }}>
                  <span>{r.source==='error'?'❌':'✅'}</span>
                  <div>
                    <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(200,216,248,0.9)', fontWeight:700 }}>{r.filename}</div>
                    {r.source!=='error' && <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(90,122,184,0.5)', marginTop:2 }}>{r.rowCount} rows · {r.matched} matched to artists</div>}
                  </div>
                  {r.source!=='error' && <span style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:9, padding:'2px 8px', borderRadius:3, background:r.source==='anghami'?'rgba(255,80,100,0.1)':'rgba(59,130,246,0.1)', color:r.source==='anghami'?'#ff8090':'#7eb8ff' }}>{r.source==='anghami'?'ANGHAMI':'PLATFORM'}</span>}
                </div>
                {r.unmatched?.length>0 && r.source!=='error' && (
                  <div style={{ padding:'8px 12px', borderRadius:6, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24', fontSize:11, fontFamily:'monospace' }}>
                    ⚠️ Unmatched artists: {r.unmatched.slice(0,5).join(', ')}{r.unmatched.length>5?` +${r.unmatched.length-5} more`:''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
