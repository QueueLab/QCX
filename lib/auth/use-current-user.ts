import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../supabase/browser-client';
import type { User } from '@supabase/supabase-js';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser();
      if (data) {
        setUser(data.user);
      }
      setLoading(false);
    }

    fetchUser();
  }, [supabase.auth]);

  return { user, loading };
}
