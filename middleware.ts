import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Normalize 'origin' and 'x-forwarded-host' to avoid "Invalid Server Actions request"
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

  // Skip middleware for server actions to avoid breaking them
  if (request.headers.get('next-action')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
