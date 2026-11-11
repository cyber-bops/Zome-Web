// The only way to the Zome API. Runs on this app's server, never in the
// browser: the browser talks only to this app, and this app talks to the API
// server to server with the person's session (ADR-0022 §2, ADR-0053 §2).

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/session'

const API = process.env.ZOME_API_URL ?? 'http://localhost:8080'

export class APIError extends Error {
  constructor(public status: number, public type: string, message: string, public until?: string) {
    super(message)
  }
}

/** The caller's address, so the API's limits count each browser, not this app. */
export async function callerAddress(): Promise<string> {
  const h = await headers()
  return h.get('fly-client-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
}

// How long a page waits for the API before saying it is taking too long.
const TIMEOUT_MS = 15_000

/**
 * The API took too long or could not be reached. A page goes to
 * /unavailable, which offers to come back; a call through /api/m answers
 * the browser with the same as an error it can show.
 */
async function unavailable(kind: 'timeout' | 'down'): Promise<never> {
  const path = (await headers()).get('x-zome-path') ?? '/'
  if (path.startsWith('/api/')) {
    throw kind === 'timeout'
      ? new APIError(504, 'Timeout', 'That took too long. Try again.')
      : new APIError(503, 'Unavailable', 'Zome isn’t answering right now. Try again in a minute.')
  }
  redirect(`/unavailable?kind=${kind}&back=${encodeURIComponent(path)}`)
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; token?: string | null; headers?: Record<string, string> } = {}): Promise<T> {
  const token = init.token === undefined ? (await cookies()).get(SESSION_COOKIE)?.value : init.token
  const address = await callerAddress()
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(address ? { 'X-Forwarded-For': address } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    return unavailable(e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'down')
  }
  const text = await res.text()
  let data: { type?: string; message?: string; until?: string }
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    // A route the API doesn't serve at all (the Care Purse switched off)
    // answers a plain 404: that is "not here", not "down".
    if (res.status === 404) throw new APIError(404, 'NotFound', 'not found')
    // Otherwise not the API's own answer: Fly's proxy saying the API is down.
    return unavailable(res.status === 504 ? 'timeout' : 'down')
  }
  if (!res.ok) {
    throw new APIError(res.status, data.type ?? 'Error', data.message ?? 'Something went wrong. Try again.', data.until)
  }
  return data as T
}

// What the API returns to the web app.
export type Profile = { nickname?: string; full_name?: string; email?: string }

/** The signed-in person's profile, or null when there is no live session. */
export async function me(): Promise<Profile | null> {
  try {
    return await api<Profile>('/v1/me/profile')
  } catch (e) {
    if (e instanceof APIError && e.status === 401) return null
    throw e
  }
}

export type Movement = { kind: 'top_up' | 'reversal' | 'interest' | 'cashback' | 'payment' | 'team' | 'other' | string; amount_kobo: number; at: string; from?: string }
export type TopUp = {
  id: string
  amount_kobo: number
  state: 'opening' | 'awaiting_payment' | 'part_paid' | 'paid' | 'failed' | 'reversed' | 'expired' | string
  fee_kobo: number
  total_kobo: number
  bank_name?: string
  account_number?: string
  account_name?: string
  expires_at: string
  created_at: string
}
export type Mandate = {
  id: string
  state: 'opening' | 'awaiting_authorisation' | 'active' | 'suspended' | 'rejected' | 'cancelled' | 'failed' | 'expired'
  reason?: string
  bank_code: string; bank_name: string; account_number: string; account_name: string
  limit_kobo: number
  authorisation: { text: string; amount_kobo?: number; account_number?: string; bank_name?: string }
}
export type Purse = {
  currency: 'NGN'
  balance_kobo: number
  movements: Movement[]
  top_ups: TopUp[]
  interest_rate_bps: number
  linked_account?: Mandate
  schedule?: { id: string; amount_kobo: number; cadence: 'daily' | 'weekly' | 'monthly'; starts_on: string; next_on?: string }
  debits?: { id: string; state: string; amount_kobo: number; fee_kobo: number; total_kobo: number; scheduled: boolean; created_at: string }[]
}

/** The Care Purse, or null when it is not open to this person (the API answers 404). */
export async function purse(): Promise<Purse | null> {
  try {
    return await api<Purse>('/v1/vault')
  } catch (e) {
    if (e instanceof APIError && e.status === 404) return null
    throw e
  }
}

export type Checklist = { steps: { id: string; state: 'done' | 'to_do' | 'waiting' | 'unavailable' }[]; done: number; total: number; percent: number }

/** The profile checklist (BVN, NIN, selfie, …), or null if it can't be read just now. */
export async function checklist(): Promise<Checklist | null> {
  try {
    return await api<Checklist>('/v1/me/checklist')
  } catch (e) {
    if (e instanceof APIError) return null
    throw e
  }
}
