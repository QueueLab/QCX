import { createClient as createSupabaseClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const getSupabaseBrowserClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      async fetch(url, options = {}) {
        let clerkToken = null;
        if (typeof window !== 'undefined') {
          try {
            clerkToken = await (window as any).Clerk?.session?.getToken();
          } catch (e) {
            console.warn('[Supabase Browser Client] Failed to get Clerk token:', e);
          }
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
