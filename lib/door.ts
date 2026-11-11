// What the browser may ask the API for through /api/z, and nothing else.
// Each slice of the web app adds its routes here (ADR-0053, "Built in this order").

const allowed: Array<[string, RegExp]> = [
  ['POST', /^auth\/(start|verify|sign-in|sign-out|sign-out-all|password)$/],
  ['GET', /^me\/profile$/],
  ['PUT', /^me\/profile$/],
  ['GET', /^vault$/],
  ['POST', /^vault\/top-ups$/],
]

export function isAllowed(method: string, path: string): boolean {
  return allowed.some(([m, pattern]) => m === method && pattern.test(path))
}

/** Routes that sign someone in: they answer with a session, which becomes the cookie. */
export const signsIn = (path: string) => path === 'auth/verify' || path === 'auth/sign-in'

/** Routes that need no session at all. */
export const sessionless = (path: string) => path === 'auth/start' || signsIn(path)

/** The one header passed on from the browser: a top-up's Idempotency-Key, so a retry never adds money twice. */
export function passedHeaders(path: string, given: Headers): Record<string, string> {
  const key = given.get('idempotency-key')?.trim()
  return path === 'vault/top-ups' && key && key.length <= 100 && /^[\w-]+$/.test(key) ? { 'Idempotency-Key': key } : {}
}
