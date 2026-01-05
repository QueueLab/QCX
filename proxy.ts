import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSupabaseUserAndSessionOnServer } from "./lib/auth/get-current-user"

export async function proxy(request: NextRequest) {
  // If a request is forwarded (for example from a remote editor / codespace)
  // it may set `x-forwarded-host` that doesn't match `origin`. Next's
  // Server Actions will reject such requests. Normalize `origin` and strip
  // the header when it mismatches to avoid "Invalid Server Actions request"
  // errors in dev. This runs before the `next-action` short-circuit so we
  // don't accidentally skip the normalization for forwarded Server Actions.
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
    const headers = new Headers(request.headers)
    headers.delete("x-forwarded-host")
    return NextResponse.next({ request: { headers } })
  }

  // Skip proxy for server actions to avoid breaking them
  if (request.headers.get("next-action")) {
    return NextResponse.next()
  }

  // Allow public access to auth-related pages and assets used by the auth flow
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/error") ||
    pathname === "/login"
  ) {
    return NextResponse.next()
  }

  // Check authentication server-side using our helper. If auth is disabled
  // for dev, the helper returns a mock user. Only run this for protected
  // routes (skip already allowed auth paths above).
  try {
    const { user } = await getSupabaseUserAndSessionOnServer()
    const isAuthenticated = !!user

    // If the request is for the settings page and the user is not authenticated
    if (pathname.startsWith("/settings") && !isAuthenticated) {
      return NextResponse.redirect(new URL("/auth", request.url))
    }
  } catch (err) {
    // On any auth-check failure, be conservative and redirect to auth
    return NextResponse.redirect(new URL("/auth", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Only run the proxy for non-auth protected routes. Exclude auth pages
  // so they can be pre-rendered / previewed by Next.js (avoid proxying).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth|api/auth).*)"],
}

