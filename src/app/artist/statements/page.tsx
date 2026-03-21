import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArtistLayout from '@/components/artist/Layout'
import Link from 'next/link'

export default async function StatementsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: artist } = await supabase.from('artists').select('*').eq('user_id', user.id).single()
  if (!artist) redirect('/auth/login')

  const { data: statements } = await supabase
    .from('royalty_statements').select('*')
    .eq('artist_id', artist.id)
    .order('period', { ascending: false })

  const { data: notifications } = await supabase
    .from('notifications').select('*')
    .eq('artist_id', artist.id).order('created_at', { ascending: false }).limit(5)

  const statusColor: Record<string, string> = {
    draft: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    sent:  'text-blue-400 bg-blue-400/10 border-blue-400/30',
    paid:  'text-green-400 bg-green-400/10 border-green-400/30',
  }

  return (
    <ArtistLayout artist={artist} notifications={notifications || []} activePage="statements">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Royalty Statements</h1>
        <p className="font-mono text-xs text-blue-300/50 mt-1 tracking-wider">Your earnings history from Middle Beats</p>
      </div>

      {!statements?.length ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4 opacity-30">💸</div>
          <div className="text-xl font-bold opacity-40">No statements yet</div>
          <div className="font-mono text-xs text-blue-300/30 mt-2">Your statements will appear here once issued by Middle Beats</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
            <span className="font-mono text-xs tracking-widest text-blue-300/60 uppercase">{statements.length} statements</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.07)' }}>
            {statements.map(stmt => (
              <div key={stmt.id} className="flex items-center justify-between px-6 py-4 hover:bg-blue-sky/3 transition-colors flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    📄
                  </div>
                  <div>
                    <div className="font-bold">{stmt.period}</div>
                    <div className="font-mono text-xs text-blue-300/40 mt-0.5">
                      {stmt.total_streams.toLocaleString()} streams
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sky-300 font-bold text-lg">${Number(stmt.total_revenue).toFixed(2)}</div>
                    <span className={`font-mono text-xs px-2 py-0.5 rounded border ${statusColor[stmt.status]}`}>
                      {stmt.status}
                    </span>
                  </div>
                  <Link href={`/artist/statements/${stmt.id}`} className="btn-ghost px-4 py-2 text-xs">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ArtistLayout>
  )
}
