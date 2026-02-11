import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../supabase/client';

// Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true';
const ANONYMOUS_USER_ID = process.env.ANONYMOUS_USER_ID || '00000000-0000-0000-0000-000000000000';

/**
 * Retrieves the Supabase user and session object in server-side contexts
 * (Route Handlers, Server Actions, Server Components).
 */
export async function getSupabaseUserAndSessionOnServer(): Promise<{
  user: User | null;
  session: Session | null;
  error: any | null;
}> {
  if (!ENABLE_AUTH) {
    return {
      user: { id: ANONYMOUS_USER_ID, email: 'anonymous@example.com' } as User,
      session: null,
      error: null
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Auth] ENABLE_AUTH is true but Supabase URL or Anon Key is missing.');
    return { user: null, session: null, error: new Error('Missing Supabase environment variables') };
  }

  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (error.message !== 'Auth session missing!') {
        console.error('[Auth] Error getting Supabase user:', error.message);
      }
      return { user: null, session: null, error };
    }

    if (!user) {
      return { user: null, session: null, error: null };
    }

    const { data: { session } } = await supabase.auth.getSession();
    return { user, session, error: null };
  } catch (err) {
    console.error('[Auth] Unexpected error in getSupabaseUserAndSessionOnServer:', err);
    return { user: null, session: null, error: err };
  }
}

/**
 * Retrieves the current user's ID in server-side contexts.
 * Returns null if user is not authenticated and auth is enabled.
 */
export async function getCurrentUserIdOnServer(): Promise<string | null> {
  const { user } = await getSupabaseUserAndSessionOnServer();
  return user?.id || null;
}
