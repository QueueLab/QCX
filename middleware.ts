import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Skip middleware for server actions to avoid breaking them
  if (request.headers.get("next-action")) {
    return NextResponse.next();
  }

  // Allow requests to https://planet.queue.cx explicitly
  if (request.nextUrl.pathname === "/planet" || request.url.includes("planet.queue.cx")) {
    // Option 1: Redirect to the external URL
    return NextResponse.redirect("https://planet.queue.cx");

    // Option 2: If you want to proxy or allow the request to pass through without redirect
    // return NextResponse.next();
  }

  // Example: Check if the user is authenticated for protected routes
  const isAuthenticated = true; // Replace with actual auth check

  // If the request is for the settings page and the user is not authenticated
  if (request.nextUrl.pathname.startsWith("/settings") && !isAuthenticated) {
    // Redirect to the login page
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - Static files (_next/static)
     * - Image optimization (_next/image)
     * - Favicon (favicon.ico)
     * - Allow paths related to planet.queue.cx
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/planet", // Explicitly include the /planet path
  ],
};
