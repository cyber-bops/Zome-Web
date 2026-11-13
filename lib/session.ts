// The one cookie the web app keeps: the session token. In production it is a
// __Host- cookie, bound to this exact host, sent only over HTTPS and never
// readable by the page's own script (ADR-0022 §4).

export const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-zome_web' : 'zome_web'

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // Lax, not Strict: people open Zome from links in WhatsApp and email, and a
  // Strict cookie is not sent on that first visit. Every change must still come
  // from this site's own pages (the Origin check in the API door).
  sameSite: 'lax' as const,
  path: '/',
  // The cookie lasts as long as the session the API gave (see sessionCookieAge);
  // this is the most it is ever kept. A web session lasts 12 hours at most and
  // the API ends it after 15 minutes idle (ADR-0056), or when it is revoked.
  maxAge: 30 * 24 * 60 * 60,
}

/** Seconds until the API's session ends, so the cookie goes when it does. */
export function sessionCookieAge(expiresAt: unknown, now = Date.now()): number {
  const ends = typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN
  if (Number.isNaN(ends)) return SESSION_COOKIE_OPTIONS.maxAge
  return Math.max(0, Math.min(SESSION_COOKIE_OPTIONS.maxAge, Math.floor((ends - now) / 1000)))
}

// The browser's device key (ADR-0055): a random value that says "this
// browser" to the API, so a password alone works only where the account has
// signed in with an email code or Google before. HttpOnly like the session, so
// the page's own script can't read it; it outlives signing out, as the
// browser does. The door adds it to sign-in requests (app/api/z).
export const DEVICE_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-zome_device' : 'zome_device'

export const DEVICE_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, maxAge: 400 * 24 * 60 * 60 }

const KEY_SHAPE = /^[A-Za-z0-9_-]{32,128}$/

/** The browser's key if it has a good one, or a fresh one (32 random bytes). */
export function deviceKey(existing: string | undefined): string {
  if (existing && KEY_SHAPE.test(existing)) return existing
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
}
