'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { syncUser } from '@/lib/actions/sync-user';

export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const [dbId, setDbId] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (isLoaded && user?.id) {
      setDbLoading(true);
      setSyncFailed(false);

      syncUser()
        .then((id) => {
          if (isMounted) {
            if (id) {
              setDbId(id);
            } else {
              setSyncFailed(true);
            }
          }
        })
        .catch((err) => {
          console.error('[Auth] Failed to sync user ID:', err);
          if (isMounted) setSyncFailed(true);
        })
        .finally(() => {
          if (isMounted) setDbLoading(false);
        });
    } else if (isLoaded && !user) {
      setDbId(null);
      setDbLoading(false);
      setSyncFailed(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isLoaded, user?.id]);

  // Map Clerk user to the structure expected by consumers
  return {
    user: user ? {
      id: dbId, // Explicitly return DB UUID or null (don't fallback to Clerk ID)
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      user_metadata: {
        name: user.fullName,
        avatar_url: user.imageUrl
      }
    } : null,
    loading: !isLoaded || dbLoading,
    syncFailed
  };
}
