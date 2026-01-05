import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User, Session } from '@supabase/supabase-js';

// Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Retrieves the Supabase user and session object in server-side contexts
 * (Route Handlers, Server Actions, Server Components).
 * Uses '@supabase/ssr' for cookie-based session management.
 *
 * @returns {Promise<{ user: User | null; session: Session | null; error: any | null }>}
 */
export async function getSupabaseUserAndSessionOnServer(): Promise<{
  user: User | null;
  session: Session | null;
  error: any | null;
}> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Auth] Supabase URL or Anon Key is not set for server-side auth.');
    return { user: null, session: null, error: new Error('Missing Supabase environment variables') };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string): Promise<string | undefined> {
        const cookie = (await cookieStore).get(name); // Use the correct get method
        return cookie?.value; // Return the value or undefined
      },
      async set(name: string, value: string, options: CookieOptions): Promise<void> {
        try {
          const store = await cookieStore;
          store.set({ name, value, ...options }); // Set cookie with options
        } catch (error) {
          // console.warn(`[Auth] Failed to set cookie ${name}:`, error);
        }
      },
      async remove(name: string, options: CookieOptions): Promise<void> {
        try {
          const store = await cookieStore;
          store.set({ name, value: '', ...options, maxAge: 0 }); // Delete cookie by setting maxAge to 0
        } catch (error) {
          // console.warn(`[Auth] Failed to delete cookie ${name}:`, error);
        }
      },
    },
  });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('[Auth] Error getting Supabase session on server:', error.message);
    return { user: null, session: null, error };
  }

  if (!session) {
    // console.log('[Auth] No active Supabase session found.');
    return { user: null, session: null, error: null };
  }

  // Log session details for debugging in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const store = await cookies();
      const access = store.get('sb-access-token')?.value || store.get('sb:token')?.value || null;
      const refresh = store.get('sb-refresh-token')?.value || null;
      console.log('[Auth] Session found for user:', session.user.email, 'accessCookiePresent:', !!access, 'refreshCookiePresent:', !!refresh);
    } catch (e) {
      // best-effort logging, not fatal
      console.warn('[Auth] Could not inspect cookie store for debug logging', e);
    }
  }

  return { user: session.user, session, error: null };
}

/**
 * Retrieves the current user's ID in server-side contexts.
 * Enforces authentication—returns null if user is not authenticated.
 *
 * @returns {Promise<string | null>} The user ID if authenticated, otherwise null.
 */
export async function getCurrentUserIdOnServer(): Promise<string | null> {
  const { user, error } = await getSupabaseUserAndSessionOnServer();
  if (error) {
    // Error is already logged in getSupabaseUserAndSessionOnServer
    return null;
  }
  if (!user) {
    // No session means user is not authenticated
    return null;
  }
  return user.id;
}