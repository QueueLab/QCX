import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User, Session } from '@supabase/supabase-js';

// Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const AUTH_DISABLED_FLAG =
  process.env.AUTH_DISABLED_FOR_DEV === 'true' &&
  process.env.NODE_ENV !== 'production';
const MOCK_USER_ID = 'dev-user-001'; // A consistent mock user ID for dev mode

/**
 * Retrieves the Supabase user and session object in server-side contexts
 * (Route Handlers, Server Actions, Server Components).
 * Uses '@supabase/ssr' for cookie-based session management.
 * If AUTH_DISABLED_FOR_DEV is true, returns a mock user.
 *
 * @returns {Promise<{ user: User | null; session: Session | null; error: any | null }>}
 */
export async function getSupabaseUserAndSessionOnServer(): Promise<{
  user: User | null;
  session: Session | null;
  error: any | null;
}> {
  if (AUTH_DISABLED_FLAG) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] AUTH_DISABLED_FOR_DEV is true. Returning mock user session.');
    }
    // Construct a mock user and session object that matches the expected structure
    const mockUser: User = {
      id: MOCK_USER_ID,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Dev User' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'dev@example.com',
      email_confirmed_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };
    const mockSession: Session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockUser,
    };
    return { user: mockUser, session: mockSession, error: null };
  }

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

  return { user: session.user, session, error: null };
}

/**
 * Retrieves the current user's ID in server-side contexts.
 * Wrapper around getSupabaseUserAndSessionOnServer.
 * If AUTH_DISABLED_FOR_DEV is true, returns a mock user ID.
 *
 * @returns {Promise<string | null>} The user ID if a session exists or mock is enabled, otherwise null.
 */
export async function getCurrentUserIdOnServer(): Promise<string | null> {
  if (AUTH_DISABLED_FLAG) {
    // This log is helpful for debugging during development
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] AUTH_DISABLED_FOR_DEV is true. Using mock user ID: ${MOCK_USER_ID}`);
    }
    return MOCK_USER_ID;
  }

  const { user, error } = await getSupabaseUserAndSessionOnServer();
  if (error) {
    // Error is already logged in getSupabaseUserAndSessionOnServer
    return null;
  }
  return user?.id || null;
}