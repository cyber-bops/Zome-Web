import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { api, APIError } from '@/server/api'
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, sessionCookieAge } from '@/lib/session'
import { bodyLimit, isAllowed, passedHeaders, passedQuery, sessionless, signsIn } from '@/lib/door'

// The browser's one door to the API: /api/z/<path> forwards to /v1/<path>,
// only for the routes and methods listed in lib/door.ts. Anything that changes
// something must come from this site's own pages (the Origin check). The
// session token never reaches the browser: signing in sets it as the HttpOnly
// cookie (ADR-0053 §2).

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (process.env.ZOME_WEB_ORIGIN) return origin === process.env.ZOME_WEB_ORIGIN
  // Without a set origin (a preview), this site is the host the request came to.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '')
  return !!origin && !!host && origin === `${proto}://${host}`
}

async function forward(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/')
  if (!isAllowed(request.method, path)) {
    return NextResponse.json({ type: 'NotFound', message: 'not found' }, { status: 404 })
  }
  if (request.method !== 'GET' && !sameOrigin(request)) {
    return NextResponse.json({ type: 'Forbidden', message: 'not from this site' }, { status: 403 })
  }
  let body: unknown
  if (request.method !== 'GET') {
    const text = await request.text()
    if (text.length > bodyLimit(path)) {
      return NextResponse.json({ type: 'BadRequest', message: 'too large' }, { status: 413 })
    }
    try {
      body = text ? JSON.parse(text) : undefined
    } catch {
      return NextResponse.json({ type: 'BadRequest', message: 'not JSON' }, { status: 400 })
    }
  }
  const jar = await cookies()
  try {
    const data = await api<Record<string, unknown> | null>(`/v1/${path}${passedQuery(path, new URL(request.url).searchParams)}`, {
      method: request.method,
      body,
      // A sign-in carries the session it replaces, if any, so the API ends it
      // quietly (Welcome back, ADR-0052 §7). Asking for a code carries none.
      token: sessionless(path) && !signsIn(path) ? null : jar.get(SESSION_COOKIE)?.value ?? null,
      headers: passedHeaders(path, request.headers),
    })
    if (signsIn(path) && data && typeof data.token === 'string') {
      jar.set(SESSION_COOKIE, data.token, { ...SESSION_COOKIE_OPTIONS, maxAge: sessionCookieAge(data.expires_at) })
      return NextResponse.json({ user_id: data.user_id, new_account: data.new_account === true })
    }
    if (path === 'auth/sign-out' || path === 'auth/sign-out-all') {
      jar.delete(SESSION_COOKIE)
    }
    return NextResponse.json(data ?? {})
  } catch (e) {
    if (e instanceof APIError) {
      // A wrong code or password is a 401 too; that is not the session ending.
      if (e.status === 401 && !path.startsWith('auth/')) jar.delete(SESSION_COOKIE)
      return NextResponse.json({ type: e.type, message: e.message, until: e.until }, { status: e.status })
    }
    return NextResponse.json({ type: 'Unavailable', message: "Zome can't be reached right now. Try again." }, { status: 502 })
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as DELETE }
