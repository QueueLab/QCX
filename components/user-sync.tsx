'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { syncUser } from '@/lib/actions/users'

export function UserSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      syncUser()
        .then((result) => {
          if (result?.error) {
            console.error('[UserSync] Failed to sync user:', result.error)
          }
        })
        .catch((err) => {
          console.error('[UserSync] Unexpected error during sync:', err)
        })
    }
  }, [user, isLoaded])

  return null
}
