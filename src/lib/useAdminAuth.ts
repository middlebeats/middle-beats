'use client'
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
      
      // getUser() makes a server round-trip — always fresh, never stale
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        // Wrong role — sign out and redirect to login
        await supabase.auth.signOut()
        window.location.href = '/auth/login'
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      setState({ 
        ready: true, 
        email: user.email || '', 
        token: session?.access_token || '',
        authorized: true 
      })
    }
    verify()
  }, [])

  return state
}

export function useArtistAuth() {
  const [state, setState] = useState<{
    ready: boolean
    artist: any
    token: string
    authorized: boolean
  }>({ ready: false, artist: null, token: '', authorized: false })

  useEffect(() => {
    async function verify() {
      const supabase = createClient()
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        window.location.href = '/admin/dashboard'
        return
      }

      const { data: artist } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!artist) {
        window.location.href = '/auth/login'
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      setState({ 
        ready: true, 
        artist, 
        token: session?.access_token || '',
        authorized: true 
      })
    }
    verify()
  }, [])

  return state
}
