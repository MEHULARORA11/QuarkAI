import { clerkMiddleware } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = (req: NextRequest) => {
  const { pathname } = req.nextUrl
  return pathname === '/sign-in' || pathname.startsWith('/sign-in/')
}

/** Clerk authentication middleware; protects all routes except the sign-in page. */
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

/** Next.js middleware matcher — runs on app routes, API routes, and Clerk endpoints. */
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
}