import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // If a request is forwarded (for example from a remote editor / codespace)
  // it may set `x-forwarded-host` that doesn't match `origin`. Next's
  // Server Actions will reject such requests. Normalize `origin` and strip
  // the header when it mismatches to avoid "Invalid Server Actions request"
  // errors in dev.
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

  return NextResponse.next()
}

export const config = {
  // Run proxy on all routes except static assets and _next internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

