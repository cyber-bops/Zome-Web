'use client'

// The browser's calls to this app's /api/z door. Never to the Zome API
// directly, and never with a token: the session rides in the HttpOnly cookie.
export class Refused extends Error {
  constructor(public status: number, public type: string, message: string, public until?: string) {
    super(message)
  }
}

export async function call<T>(path: string, method = 'GET', body?: unknown, extra?: Record<string, string>): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/z/${path}`, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extra },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
      // Long enough for a weak mobile connection, not just for our servers.
      signal: AbortSignal.timeout(45_000),
    })
  } catch (e) {
    // No answer at all: the connection, or a server taking too long. Giving
    // up here doesn't stop the server, so a change (a withdrawal, an
    // approval) may still have gone through; say so, so nobody does it twice.
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError'
    if (method !== 'GET') {
      throw new Refused(0, timedOut ? 'Timeout' : 'Offline', 'We didn’t hear back from Zome. It may still have gone through, so refresh to check before trying again.')
    }
    throw timedOut
      ? new Refused(0, 'Timeout', 'That took too long. Check your connection and try again.')
      : new Refused(0, 'Offline', 'Couldn’t reach Zome. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Refused(res.status, data.type ?? 'Error', data.message ?? 'Sorry, something went wrong on our side. Please try again.', data.until)
  return data as T
}
