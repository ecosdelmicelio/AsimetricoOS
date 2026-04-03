'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import type { AuthUser } from '@/features/auth/types'
import type { Tables } from '@/shared/types/database'

export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const profile = data as Tables<'profiles'> | null

      if (profile) {
        setAuthUser({
          id: user.id,
          email: user.email ?? '',
          profile,
          role: profile.role as AuthUser['role'],
        })
      }
      setLoading(false)
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { authUser, loading }
}
