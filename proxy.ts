import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from './lib/session'

// Every page gets a Content-Security-Policy with a fresh nonce: no inline
// script without it, no script from anywhere else, no framing (ADR-0022 §5).
// A visitor with no session is sent to sign in.
function pictureOrigins(): string {
  return (process.env.ZOME_PICTURE_ORIGINS ?? '').split(/\s+/).filter(o => /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o)).join(' ')
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const signedIn = request.cookies.has(SESSION_COOKIE)
  if (!signedIn && !pathname.startsWith('/sign-in') && !pathname.startsWith('/sign-up') && !pathname.startsWith('/api/') && !pathname.startsWith('/unavailable') && !pathname.startsWith('/give/') && !pathname.startsWith('/fund/') && pathname !== '/terms' && pathname !== '/privacy') {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const dev = process.env.NODE_ENV === 'development'
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Profile photos come as signed links to the private bucket, and logos
    // from the public one, both on Tigris (ADR-0063); ZOME_PICTURE_ORIGINS
    // names another host (a custom domain, a local stand-in).
    `img-src 'self' blob: data: https://fly.storage.tigris.dev https://*.fly.storage.tigris.dev ${pictureOrigins()}`.trimEnd(),
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    dev ? '' : 'upgrade-insecure-requests',
  ].filter(Boolean).join('; ')

  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  // Where the request was going, so a page whose API call times out can
  // offer to come back here (server/api.ts).
  headers.set('x-zome-path', pathname + search)
  headers.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|fonts|favicon.ico|manifest.webmanifest|icon|apple-icon).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
