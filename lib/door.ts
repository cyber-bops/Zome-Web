// What the browser may ask the API for through /api/z, and nothing else.
// Each slice of the web app adds its routes here (ADR-0053, "Built in this order").

const id = '[0-9a-f-]{36}'
const allowed: Array<[string, RegExp]> = [
  ['POST', /^auth\/(start|verify|sign-in|sign-out|sign-out-all|password)$/],
  ['GET', /^me\/profile$/],
  ['PUT', /^me\/profile$/],
  // Identity: the BVN, with a code to the phone on its record (ADR-0052 §16).
  // The family link: the person's own, and the giving page anyone may open (ADR-0053 §6).
  ['GET', /^me\/gift-link$/],
  ['POST', /^me\/gift-link$/],
  ['DELETE', /^me\/gift-link$/],
  ['GET', /^give\/[a-z0-9-]{6,40}$/],
  ['POST', /^give\/[a-z0-9-]{6,40}$/],
  ['POST', /^me\/bvn$/],
  ['POST', /^me\/bvn\/confirm$/],
  ['POST', /^me\/nin$/],
  ['POST', /^me\/selfie$/],
  ['POST', /^me\/phone\/(code|confirm)$/],
  ['GET', /^me\/next-of-kin$/],
  ['PUT', /^me\/next-of-kin$/],
  ['GET', /^vault$/],
  ['POST', /^vault\/top-ups$/],
  ['POST', /^vault\/pay-codes$/],
  // Paying for care: the PIN, the network's businesses, bills sent to a pay code.
  ['GET', /^vault\/pin$/],
  ['POST', /^vault\/pin$/],
  ['GET', /^vault\/merchants$/],
  ['POST', new RegExp(`^vault/merchants/${id}/pay$`)],
  ['GET', /^vault\/bills$/],
  ['POST', new RegExp(`^vault/bills/${id}/(approve|decline)$`)],
  // A linked bank account: one-tap funding and saving automatically (ADR-0025).
  ['GET', /^vault\/banks$/],
  ['POST', /^vault\/account-lookup$/],
  ['POST', /^vault\/mandates$/],
  ['DELETE', /^vault\/mandates\/current$/],
  ['POST', /^vault\/debits\/quote$/],
  ['POST', /^vault\/debits$/],
  ['PUT', /^vault\/schedule$/],
  ['DELETE', /^vault\/schedule$/],
  // Paying a bank account outside the network (ADR-0036).
  ['GET', /^vault\/transfers\/setup$/],
  ['GET', /^vault\/transfer-banks$/],
  ['POST', /^vault\/transfer-lookup$/],
  ['POST', /^vault\/transfers$/],
  ['GET', /^vault\/transfers$/],
  ['GET', new RegExp(`^vault/transfers/${id}$`)],
]

export function isAllowed(method: string, path: string): boolean {
  return allowed.some(([m, pattern]) => m === method && pattern.test(path))
}

/** Routes that sign someone in: they answer with a session, which becomes the cookie. */
export const signsIn = (path: string) => path === 'auth/verify' || path === 'auth/sign-in'

/** Routes that need no session at all. */
export const sessionless = (path: string) => path === 'auth/start' || path.startsWith('give/') || signsIn(path)

/** Anything that moves money carries an Idempotency-Key, so a retry never pays twice. */
const keyed = (path: string) => path === 'vault/top-ups' || path.startsWith('give/') || path === 'vault/transfers' || path === 'vault/debits' || new RegExp(`^vault/merchants/${id}/pay$`).test(path)

/** The one header passed on from the browser: the Idempotency-Key of a payment. */
export function passedHeaders(path: string, given: Headers): Record<string, string> {
  const key = given.get('idempotency-key')?.trim()
  return keyed(path) && key && key.length <= 100 && /^[\w-]+$/.test(key) ? { 'Idempotency-Key': key } : {}
}

/** The query a route may carry: the search words for the network's businesses, nothing else. */
export function passedQuery(path: string, given: URLSearchParams): string {
  if (path !== 'vault/merchants') return ''
  const q = given.get('q')?.trim().slice(0, 80)
  return q ? `?${new URLSearchParams({ q })}` : ''
}

/** How much a request may carry: a selfie is a photo, everything else is small. */
export function bodyLimit(path: string): number {
  return path === 'me/selfie' ? 5 * 1024 * 1024 : 16_384
}
