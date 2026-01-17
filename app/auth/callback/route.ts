import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { TIER_CONFIGS, TIERS } from '@/lib/utils/subscription';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookie = (await cookieStore).get(name)
            return cookie?.value
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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[Auth Callback] Exchange code error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        code: code?.substring(0, 10) + '...'
      })
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
    } else {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (!userErr && user) {
          console.log('[Auth Callback] User signed in:', user.email)

          // Check if user exists in the 'users' table
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (!existingUser && !fetchError) {
             console.log('[Auth Callback] Initializing new user:', user.id);
             // Create new user entry
             const { error: insertError } = await supabase.from('users').insert({
                id: user.id,
                email: user.email,
                credits: 0, // Start with 0 or free tier credits
                tier: 'free',
                // Add other default fields if necessary
             });
             
             if (insertError) {
                console.error('[Auth Callback] Error creating user record:', insertError);
             }
          }
        }
      } catch (e) {
        console.warn('[Auth Callback] Could not fetch user after exchange', e)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
