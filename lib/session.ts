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
  // this is the most it is ever kept. The API ends a session sooner if it is idle or revoked.
  maxAge: 30 * 24 * 60 * 60,
}

/** Seconds until the API's session ends, so the cookie goes when it does. */
export function sessionCookieAge(expiresAt: unknown, now = Date.now()): number {
  const ends = typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN
  if (Number.isNaN(ends)) return SESSION_COOKIE_OPTIONS.maxAge
  return Math.max(0, Math.min(SESSION_COOKIE_OPTIONS.maxAge, Math.floor((ends - now) / 1000)))
}
