import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../supabase/browser-client';
import type { User } from '@supabase/supabase-js';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // If auth is disabled or Supabase not configured, we might want to return a mock user
    // However, the server side is the source of truth for "authenticated" status
    // For the UI, we'll just set loading to false if no supabase client
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function fetchUser() {
      try {
        const { data, error } = await supabase!.auth.getUser();
        if (data?.user) {
          setUser(data.user);
        }
      } catch (e) {
        console.warn('[Auth] useCurrentUser: Failed to fetch user', e);
      }
      setLoading(false);
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    }
  }, []);

  return { user, loading };
}
