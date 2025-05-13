import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip middleware for server actions to avoid breaking them
  if (request.headers.get('next-action')) {
    return NextResponse.next()
  }

  // Example: Check if the user is authenticated for protected routes
  const isAuthenticated = true // Replace with actual auth check

  // If the request is for the settings page and the user is not authenticated
  if (request.nextUrl.pathname.startsWith("/settings") && !isAuthenticated) {
    // Redirect to the login page
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

