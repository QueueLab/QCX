'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { syncUser } from '@/lib/actions/users'

export function UserSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      syncUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
      })
    }
  }, [user, isLoaded])

  return null
}
