'use client'

// Who signed in last on this browser, for Welcome back (ADR-0052 §7): a first
// name and an email, nothing else. A convenience only: it can be gone at any
// time, and signing in never depends on it.
export type Remembered = { firstName: string; email: string }

const key = 'zome.remembered'

export function recall(): Remembered | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null')
    return v && typeof v.email === 'string' && v.email.includes('@')
      ? { firstName: typeof v.firstName === 'string' ? v.firstName : '', email: v.email } : null
  } catch {
    return null
  }
}

export function remember(r: Remembered) {
  try { localStorage.setItem(key, JSON.stringify(r)) } catch { /* private window */ }
}

export function forget() {
  try { localStorage.removeItem(key) } catch { /* private window */ }
}
