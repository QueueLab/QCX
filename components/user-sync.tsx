'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { syncUser } from '@/lib/actions/sync-user';

/**
 * Client component that triggers user synchronization on mount if authenticated.
 */
export function UserSync() {
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      syncUser().catch(err => console.error("[Auth] User sync failed:", err));
    }
  }, [isLoaded, isSignedIn]);

  return null;
}
