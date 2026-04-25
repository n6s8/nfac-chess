import { useEffect, useState } from 'react'
import { getCurrentUser, isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { AuthUser } from '@/types'

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        const currentUser = await getCurrentUser()
        if (active) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error('[auth] bootstrap error:', error)
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    if (!isSupabaseConfigured) {
      return () => {
        active = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void getCurrentUser()
        .then((nextUser) => {
          if (active) {
            setUser(nextUser)
          }
        })
        .catch((error) => {
          console.error('[auth] state change error:', error)
          if (active) {
            setUser(null)
          }
        })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    refresh: async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      return currentUser
    },
    setUser,
  } as const
}
