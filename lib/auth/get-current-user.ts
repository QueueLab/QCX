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
        const store = await cookieStore;
        return store.get(name)?.value;
      },
      async set(name: string, value: string, options: CookieOptions): Promise<void> {
        try {
          const store = await cookieStore;
          store.set({ name, value, ...options });
        } catch (error) {
          // console.warn(`[Auth] Failed to set cookie ${name}:`, error);
        }
      },
      async remove(name: string, options: CookieOptions): Promise<void> {
        try {
          const store = await cookieStore;
          store.set({ name, value: '', ...options, maxAge: 0 });
        } catch (error) {
          // console.warn(`[Auth] Failed to delete cookie ${name}:`, error);
        }
      },
    },
  });

  // getUser is more reliable for server-side checks as it verifies the JWT
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, session: null, error: userError };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  return { user, session, error: sessionError };
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
