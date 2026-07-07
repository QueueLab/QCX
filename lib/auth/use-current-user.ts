'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { syncUser } from '@/lib/actions/sync-user';

export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const [dbId, setDbId] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      setDbLoading(true);
      syncUser()
        .then((id) => {
          if (id) setDbId(id);
        })
        .catch((err) => console.error('[Auth] Failed to sync user ID:', err))
        .finally(() => setDbLoading(false));
    } else {
      setDbId(null);
      setDbLoading(false);
    }
  }, [isLoaded, user]);

  // Map Clerk user to the structure expected by consumers
  return {
    user: user ? {
      id: dbId || user.id, // Use DB UUID if available, fallback to Clerk ID
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      user_metadata: {
        name: user.fullName,
        avatar_url: user.imageUrl
      }
    } : null,
    loading: !isLoaded || dbLoading
  };
}
