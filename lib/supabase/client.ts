import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const cookieStore = cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          const store = await cookieStore
          return store.get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          const store = await cookieStore
          store.set({ name, value, ...options })
        },
        async remove(name: string, options: CookieOptions) {
          const store = await cookieStore
          store.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Service role client for admin operations (bypasses RLS)
export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    // Return null instead of throwing to avoid crashing if only using DB
    console.warn('getSupabaseServiceClient: Missing credentials.')
    return null
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
