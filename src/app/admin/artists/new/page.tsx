'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/Layout'
import toast from 'react-hot-toast'

export default function NewArtistPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', name_ar: '', email: '', phone: '', bio: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) { toast.error('Name and email are required'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/admin/create-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create artist')
      toast.success(`Artist created! Welcome email sent to ${form.email}`)
      router.push('/admin/artists')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout activePage="artists">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Add New Artist</h1>
          <p className="font-mono text-xs text-blue-300/50 mt-1 tracking-wider">
            Creates login credentials and sends a welcome email automatically
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Artist Name (English) *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Madeleine Matar" required/>
              </div>
              <div>
                <label className="label">Artist Name (Arabic)</label>
                <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)}
                  placeholder="e.g. مادلين مطر" dir="rtl"/>
              </div>
            </div>

            <div>
              <label className="label">Email Address *</label>
              <input className="input" type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="artist@example.com" required/>
              <p className="font-mono text-xs text-blue-300/40 mt-1.5">
                A temporary password will be generated and emailed to this address.
              </p>
            </div>

            <div>
              <label className="label">Phone (optional)</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+961 xx xxx xxx"/>
            </div>

            <div>
              <label className="label">Bio (optional)</label>
              <textarea className="input resize-none h-24" value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Short artist biography…"/>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating…' : '✓ Create Artist & Send Welcome Email'}
              </button>
              <button type="button" onClick={() => router.back()} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 p-4 rounded-xl font-mono text-xs text-blue-300/50"
          style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
          ℹ️ What happens when you create an artist:
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>A Supabase auth account is created with a secure temporary password</li>
            <li>An artist record is linked to their login</li>
            <li>A branded welcome email is sent with their login details</li>
            <li>They will only see their own data when they log in</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}
