'use client'

import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client or handle it in the caller
    // For now, we'll return null and expect callers to handle it
    return null
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
