import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  // Diagnostic logging
  console.log('[Auth Callback] Request Details:', {
    origin,
    url: request.url,
    hasCode: !!code,
    next,
    envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING',
    envKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING',
  })

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
        codeSnippet: code?.substring(0, 10) + '...',
      })
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
    } else {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (!userErr && user) {
          console.log('[Auth Callback] User signed in successfully:', user.email)
        }
      } catch (e) {
        console.warn('[Auth Callback] Could not fetch user after exchange', e)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Check if there was an error from the provider in the URL
  const error_description = searchParams.get('error_description')
  if (error_description) {
    console.error('[Auth Callback] Provider error:', error_description)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error_description)}`)
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
