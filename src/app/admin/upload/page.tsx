'use client'
import { useState, useCallback } from 'react'
import AdminLayout from '@/components/admin/Layout'
import toast from 'react-hot-toast'

interface UploadResult {
  filename: string
  source: string
  rowCount: number
  matched: number
  unmatched: string[]
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<UploadResult[]>([])

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const csvFiles = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.csv'))
    if (csvFiles.length !== fileList.length) toast.error('Only CSV files are accepted')
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...csvFiles.filter(f => !existing.has(f.name))]
    })
  }

  async function handleUpload() {
    if (!files.length) return
    setUploading(true)
    setResults([])
    const newResults: UploadResult[] = []

    for (let i = 0; i < files.length; i++) {
      setProgress(Math.round((i / files.length) * 100))
      const formData = new FormData()
      formData.append('file', files[i])

      try {
        const res = await fetch('/api/admin/upload-report', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        newResults.push({ filename: files[i].name, ...data })
        toast.success(`${files[i].name} processed`)
      } catch (err: any) {
        toast.error(`${files[i].name}: ${err.message}`)
        newResults.push({ filename: files[i].name, source: 'error', rowCount: 0, matched: 0, unmatched: [err.message] })
      }
    }

    setProgress(100)
    setResults(newResults)
    setFiles([])
    setUploading(false)
  }

  return (
    <AdminLayout activePage="upload">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Upload Store Reports</h1>
          <p className="font-mono text-xs text-blue-300/50 mt-1 tracking-wider">
            Supports Other Music Platforms &amp; Anghami CSV formats
          </p>
        </div>

        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all mb-6 ${
            dragOver ? 'border-blue-sky bg-blue-sky/8' : 'border-blue-sky/25 hover:border-blue-sky/50 hover:bg-blue-sky/3'
          }`}
          style={{ background: dragOver ? 'rgba(59,130,246,0.08)' : 'rgba(18,68,204,0.03)' }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => document.getElementById('csvInput')?.click()}
        >
          <input id="csvInput" type="file" multiple accept=".csv" className="hidden"
            onChange={e => handleFiles(e.target.files)}/>
          <div className="text-5xl mb-4">📂</div>
          <div className="text-xl font-bold mb-2">Drop CSV files here</div>
          <div className="font-mono text-xs text-blue-300/50">or click to browse</div>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {['Other Music Platforms', 'Anghami'].map(s => (
              <span key={s} className="font-mono text-xs px-3 py-1 rounded-full"
                style={{ border: '1px solid rgba(59,130,246,0.3)', color: '#7eb8ff' }}>{s}</span>
            ))}
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="card mb-6">
            <div className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
              <span className="font-mono text-xs tracking-widest text-blue-300/60 uppercase">{files.length} file{files.length > 1 ? 's' : ''} ready</span>
              <button onClick={() => setFiles([])} className="font-mono text-xs text-red-400 hover:text-red-300">Clear all</button>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
              {files.map((f, i) => (
                <div key={f.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-lg">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-blue-200 truncate">{f.name}</div>
                    <div className="font-mono text-xs text-blue-300/40">{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-blue-300/40 hover:text-red-400 font-mono text-sm transition-colors">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div className="mb-6">
            <div className="flex justify-between font-mono text-xs text-blue-300/60 mb-2">
              <span>Processing…</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#1a55e8,#3b82f6)' }}/>
            </div>
          </div>
        )}

        <button onClick={handleUpload} disabled={!files.length || uploading} className="btn-primary mb-8">
          {uploading ? 'Processing…' : `⚡ Process ${files.length || ''} Report${files.length !== 1 ? 's' : ''}`}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="card">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
              <span className="font-mono text-xs tracking-widest text-blue-300/60 uppercase">Upload Results</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
              {results.map(r => (
                <div key={r.filename} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{r.source === 'error' ? '❌' : '✅'}</span>
                      <div>
                        <div className="font-mono text-xs text-blue-200 font-bold">{r.filename}</div>
                        {r.source !== 'error' && (
                          <div className="font-mono text-xs text-blue-300/50 mt-0.5">
                            {r.rowCount} rows · {r.matched} matched to artists
                          </div>
                        )}
                      </div>
                    </div>
                    {r.source !== 'error' && (
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                        r.source === 'anghami' ? 'badge-anghami' : 'badge-platform'
                      }`}>{r.source === 'anghami' ? 'Anghami' : 'Platform'}</span>
                    )}
                  </div>
                  {r.unmatched.length > 0 && r.source !== 'error' && (
                    <div className="mt-3 p-3 rounded-lg font-mono text-xs"
                      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                      ⚠️ Unmatched artists: {r.unmatched.slice(0, 5).join(', ')}
                      {r.unmatched.length > 5 && ` + ${r.unmatched.length - 5} more`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
