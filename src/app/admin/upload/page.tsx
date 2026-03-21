'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UploadResult {
  filename: string
  source: string
  rowCount: number
  matched: number
  unmatched: string[]
  error?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [results, setResults] = useState<UploadResult[]>([])

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
    setUploading(true); setResults([])
    const { data: { session } } = await createClient().auth.getSession()
    if (!session) { window.location.href = '/auth/login'; return }

    const newResults: UploadResult[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress(Math.round(((i) / files.length) * 100))
      setCurrentFile(files[i].name)
      const formData = new FormData()
      formData.append('file', files[i])
      try {
        const res = await fetch('/api/admin/upload-report', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          newResults.push({ filename: files[i].name, source: 'error', rowCount: 0, matched: 0, unmatched: [], error: data.error || `HTTP ${res.status}` })
        } else {
          newResults.push({ filename: files[i].name, ...data })
        }
      } catch (err: any) {
        newResults.push({ filename: files[i].name, source: 'error', rowCount: 0, matched: 0, unmatched: [], error: err.message })
      }
      setResults([...newResults])
    }
    setProgress(100); setCurrentFile(''); setFiles([]); setUploading(false)
  }

  const s = {
    page: { minHeight:'100vh', background:'#040e2b', padding:'32px 36px' } as React.CSSProperties,
    card: { background:'rgba(7,21,53,1)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:14, overflow:'hidden' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0 }}>Upload Reports</h1>
            <p style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.4)', marginTop:4 }}>Supports Other Music Platforms & Anghami CSV formats</p>
          </div>
          <a href="/admin/dashboard" style={{ fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.5)', textDecoration:'none' }}>← Dashboard</a>
        </div>

        {/* Drop zone */}
        <input type="file" id="csvInput" multiple accept=".csv" style={{ display:'none' }} onChange={e=>handleFiles(e.target.files)}/>
        <div
          style={{ border:`2px dashed ${dragOver?'rgba(59,130,246,0.7)':'rgba(59,130,246,0.2)'}`, borderRadius:16, padding:'48px 32px', textAlign:'center', cursor:'pointer', marginBottom:20, background: dragOver?'rgba(59,130,246,0.07)':'transparent', transition:'all 0.2s' }}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files)}}
          onClick={()=>document.getElementById('csvInput')?.click()}>
          <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
          <div style={{ fontSize:17, fontWeight:700, color:'#fff', marginBottom:6 }}>Drop CSV files here</div>
          <div style={{ fontFamily:'monospace', fontSize:12, color:'rgba(125,163,252,0.4)', marginBottom:16 }}>or click to browse</div>
          <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap' }}>
            {['Other Music Platforms', 'Anghami'].map(s => (
              <span key={s} style={{ fontFamily:'monospace', fontSize:11, padding:'3px 12px', borderRadius:20, border:'1px solid rgba(59,130,246,0.3)', color:'#7eb8ff' }}>{s}</span>
            ))}
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ ...s.card, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 18px', borderBottom:'1px solid rgba(59,130,246,0.1)' }}>
              <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(200,216,248,0.6)', letterSpacing:2 }}>{files.length} FILE{files.length>1?'S':''} QUEUED</span>
              <button onClick={()=>setFiles([])} style={{ background:'transparent', border:'none', color:'rgba(255,80,80,0.6)', fontFamily:'monospace', fontSize:11, cursor:'pointer' }}>Clear all</button>
            </div>
            {files.map((f,i) => (
              <div key={f.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderBottom:'1px solid rgba(59,130,246,0.06)' }}>
                <span>📄</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(200,216,248,0.8)' }}>{f.name}</div>
                  <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(90,122,184,0.5)', marginTop:2 }}>{(f.size/1024).toFixed(1)} KB</div>
                </div>
                <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={{ background:'transparent', border:'none', color:'rgba(90,122,184,0.4)', cursor:'pointer', fontSize:16 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'monospace', fontSize:11, color:'rgba(125,163,252,0.5)', marginBottom:6 }}>
              <span>{currentFile || 'Processing…'}</span><span>{progress}%</span>
            </div>
            <div style={{ height:4, background:'rgba(59,130,246,0.15)', borderRadius:2 }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#1a55e8,#3b82f6)', borderRadius:2, width:`${progress}%`, transition:'width 0.3s' }}/>
            </div>
          </div>
        )}

        {/* Upload button */}
        <button onClick={handleUpload} disabled={!files.length||uploading} style={{ padding:'12px 28px', background:(!files.length||uploading)?'rgba(26,85,232,0.25)':'linear-gradient(135deg,#1a55e8,#1244cc)', color:'#fff', border:'none', borderRadius:10, fontFamily:'monospace', fontSize:11, letterSpacing:2, fontWeight:700, cursor:(!files.length||uploading)?'not-allowed':'pointer', textTransform:'uppercase', marginBottom:28, boxShadow:(!files.length||uploading)?'none':'0 4px 20px rgba(26,85,232,0.4)' }}>
          {uploading ? `Processing ${currentFile}…` : `⚡ Upload ${files.length||''} Report${files.length!==1?'s':''}`}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div style={s.card}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(59,130,246,0.1)', fontFamily:'monospace', fontSize:10, letterSpacing:2, color:'rgba(200,216,248,0.5)', textTransform:'uppercase' }}>Upload Results</div>
            {results.map(r => (
              <div key={r.filename} style={{ padding:'14px 18px', borderBottom:'1px solid rgba(59,130,246,0.06)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom: (r.unmatched?.length || r.error) ? 8 : 0 }}>
                  <span style={{ fontSize:16, marginTop:1 }}>{r.error ? '❌' : r.matched > 0 ? '✅' : '⚠️'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(200,216,248,0.9)', fontWeight:700 }}>{r.filename}</div>
                    {!r.error && (
                      <div style={{ fontFamily:'monospace', fontSize:10, color:'rgba(90,122,184,0.6)', marginTop:3 }}>
                        {r.rowCount} rows parsed · {r.matched} matched to artists · Source: {r.source}
                      </div>
                    )}
                    {r.error && (
                      <div style={{ fontFamily:'monospace', fontSize:10, color:'#ff8080', marginTop:3 }}>Error: {r.error}</div>
                    )}
                  </div>
                  {!r.error && (
                    <span style={{ fontFamily:'monospace', fontSize:9, padding:'2px 8px', borderRadius:3, background:r.source==='anghami'?'rgba(255,80,100,0.1)':'rgba(59,130,246,0.1)', color:r.source==='anghami'?'#ff8090':'#7eb8ff', letterSpacing:1 }}>
                      {r.source==='anghami'?'ANGHAMI':'PLATFORM'}
                    </span>
                  )}
                </div>
                {r.unmatched?.length > 0 && (
                  <div style={{ padding:'8px 12px', borderRadius:6, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24', fontSize:11, fontFamily:'monospace', marginLeft:26 }}>
                    ⚠️ Unmatched artists (not in system): {r.unmatched.join(', ')}
                    <div style={{ marginTop:4, fontSize:10, color:'rgba(251,191,36,0.6)' }}>Add these artists first via Artists → Add Artist</div>
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
