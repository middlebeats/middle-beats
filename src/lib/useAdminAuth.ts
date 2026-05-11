import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAdminAuth() {
  const [state, setState] = useState<{
    ready: boolean
    email: string
    token: string
    authorized: boolean
  }>({ ready: false, email: '', token: '', authorized: false })

  useEffect(() => {
    async function verify() {
      const supabase = createClient()

      // Step 1: refresh session first (this auto-refreshes expired tokens)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) { window.location.href = '/auth/login'; return }

      // Step 2: now safely get the verified user
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) { window.location.href = '/auth/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { await supabase.auth.signOut(); window.location.href = '/auth/login'; return }

      setState({ ready: true, email: user.email || '', token: session?.access_token || '', authorized: true })
    }
    verify()
  }, [])

  return state
}
