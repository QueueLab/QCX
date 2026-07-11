import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      async fetch(url, options = {}) {
        let clerkToken = null;
        try {
          const authObj = await auth();
          clerkToken = await authObj.getToken();
        } catch (e) {
          console.warn('[Supabase Server Client] Failed to get Clerk token from server session:', e);
        }

        const headers = new Headers(options.headers);
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
    auth: {
      persistSession: false,
    },
  });
};
