'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface Artist { id: string; name: string; email: string }
interface Statement { id: string; period: string; total_revenue: number; total_streams: number; status: string; created_at: string; artists: { name: string; email: string } }

interface Props {
  artists: Artist[]
  statements: Statement[]
  periods: string[]
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  sent:  'text-blue-400 bg-blue-400/10 border-blue-400/30',
  paid:  'text-green-400 bg-green-400/10 border-green-400/30',
}

export default function StatementsClient({ artists, statements, periods }: Props) {
  const [selectedArtists, setSelectedArtists] = useState<string[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [generating, setGenerating] = useState(false)

  function toggleArtist(id: string) {
    setSelectedArtists(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }
  function toggleAll() {
    setSelectedArtists(prev => prev.length === artists.length ? [] : artists.map(a => a.id))
  }

  async function handleGenerate() {
    if (!selectedPeriod) { toast.error('Select a period first'); return }
    if (!selectedArtists.length) { toast.error('Select at least one artist'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/generate-statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistIds: selectedArtists, period: selectedPeriod }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Generated ${data.count} statement(s) for ${selectedPeriod}`)
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend(statementId: string) {
    try {
      const res = await fetch('/api/admin/send-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Statement emailed to artist')
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Royalty Statements</h1>
        <p className="font-mono text-xs text-blue-300/50 mt-1 tracking-wider">Generate and send monthly statements to artists</p>
      </div>

      {/* Generate Panel */}
      <div className="card p-6 mb-6">
        <h2 className="font-mono text-xs tracking-widest text-blue-300/70 uppercase mb-4">Generate New Statements</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Period */}
          <div>
            <label className="label">Period</label>
            <select className="input" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
              <option value="">Select period…</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Artists */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Artists ({selectedArtists.length} selected)</label>
              <button onClick={toggleAll} className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors">
                {selectedArtists.length === artists.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {artists.map(a => (
                <label key={a.id} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all border ${
                  selectedArtists.includes(a.id)
                    ? 'bg-blue-sky/10 border-blue-sky/40 text-white'
                    : 'border-blue-sky/10 text-blue-300/60 hover:border-blue-sky/25'
                }`}>
                  <input type="checkbox" checked={selectedArtists.includes(a.id)}
                    onChange={() => toggleArtist(a.id)} className="accent-blue-500"/>
                  <span className="font-mono text-xs truncate">{a.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={handleGenerate} disabled={generating || !selectedPeriod || !selectedArtists.length}
            className="btn-primary">
            {generating ? 'Generating…' : `⚡ Generate ${selectedArtists.length || ''} Statement${selectedArtists.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Statements List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
          <span className="font-mono text-xs tracking-widest text-blue-300/60 uppercase">{statements.length} statements</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
          {statements.map(s => (
            <div key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-blue-sky/3 transition-colors flex-wrap gap-3">
              <div>
                <div className="font-bold">{s.artists?.name}</div>
                <div className="font-mono text-xs text-blue-300/50 mt-0.5">
                  {s.period} · {s.total_streams.toLocaleString()} streams
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-right">
                  <div className="font-bold text-sky-300">${Number(s.total_revenue).toFixed(2)}</div>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded border ${STATUS_STYLE[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                {s.status === 'draft' && (
                  <button onClick={() => handleSend(s.id)} className="btn-primary px-4 py-2 text-xs">
                    📧 Send to Artist
                  </button>
                )}
                {s.status === 'sent' && (
                  <span className="font-mono text-xs text-blue-300/40">Sent</span>
                )}
              </div>
            </div>
          ))}
          {!statements.length && (
            <div className="text-center py-12 font-mono text-xs text-blue-300/30">No statements generated yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
