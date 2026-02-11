import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Supabase Session Refresh
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // IMPORTANT: Avoid refreshing session for static assets
    if (!request.nextUrl.pathname.startsWith('/_next') &&
        !request.nextUrl.pathname.startsWith('/favicon.ico') &&
        !request.nextUrl.pathname.startsWith('/images')) {
      await supabase.auth.getUser()
    }
  }

  // 2. Normalize 'origin' and 'x-forwarded-host' to avoid "Invalid Server Actions request"
  // Apply this to the FINAL response we return
  const xForwardedHost = request.headers.get("x-forwarded-host")
  const originHeader = request.headers.get("origin")
  let originHost: string | null = null
  if (originHeader) {
    try {
      originHost = originHeader.startsWith("http")
        ? new URL(originHeader).host
        : originHeader
    } catch {
      originHost = originHeader
    }
  }

  if (xForwardedHost && originHost && xForwardedHost !== originHost) {
    response.headers.delete("x-forwarded-host")
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
