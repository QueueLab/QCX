import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default function middleware(request: any, event: any) {
  if (process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === "true") {
    return NextResponse.next();
  }
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes and Next.js server actions (auth context needed for server actions)
    '/(api|trpc)(.*)',
    // Include Next.js action routes so clerkMiddleware sets up auth context for server actions
    '/_next/action/(.*)',
  ],
};
