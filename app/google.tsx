'use client'

// Continue with Google, by redirect (OpenID Connect, response_type=id_token):
// no Google script runs on Zome's pages, so the Content-Security-Policy stays
// strict. A fresh state and nonce are kept in this tab; Google sends the
// person back to /sign-in with the ID token in the URL fragment (never sent to
// any server); the page checks both, then hands the token to
// /v1/auth/provider exactly as the apps do. The server checks its signature,
// issuer and audience (ZOME_GOOGLE_AUDIENCES must list this web client ID).

export type GoogleGrant = { idToken: string; email: string; givenName: string; familyName: string }
type Pending = { state: string; nonce: string; from: string }

const KEY = 'zome.google'
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')
export const googleReturn = () => `${location.origin}/sign-in`

function claims(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), c => c.charCodeAt(0))))
  } catch { return {} }
}

/** Off to Google. `from` is the page to come back to on a cancel. */
export function goToGoogle(clientId: string, from: string) {
  const pending: Pending = { state: random(), nonce: random(), from }
  try { sessionStorage.setItem(KEY, JSON.stringify(pending)) } catch { /* the return check then fails safely */ }
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: googleReturn(), response_type: 'id_token',
    scope: 'openid email profile', state: pending.state, nonce: pending.nonce, prompt: 'select_account',
  })
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`)
}

/**
 * Back from Google: null when this isn't a return; otherwise the grant, or a
 * sentence saying why not. The fragment is cleared either way.
 */
export function backFromGoogle(): { grant?: GoogleGrant; problem?: string; from?: string } | null {
  if (!location.hash.includes('state=')) return null
  const back = new URLSearchParams(location.hash.slice(1))
  history.replaceState(null, '', location.pathname + location.search)
  let pending: Pending | null = null
  try { pending = JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); sessionStorage.removeItem(KEY) } catch { /* none */ }
  if (!pending || back.get('state') !== pending.state) return { problem: 'That Google sign-in didn’t start here. Try again.' }
  if (back.get('error')) return { from: pending.from, problem: back.get('error') === 'access_denied' ? undefined : 'Google didn’t sign you in. Try again.' }
  const idToken = back.get('id_token') ?? ''
  const c = claims(idToken)
  if (!idToken || c.nonce !== pending.nonce) return { from: pending.from, problem: 'That Google sign-in couldn’t be confirmed. Try again.' }
  return { from: pending.from, grant: { idToken, email: String(c.email ?? ''), givenName: String(c.given_name ?? ''), familyName: String(c.family_name ?? '') } }
}

export function GoogleButton({ clientId, from, disabled }: { clientId: string; from: string; disabled?: boolean }) {
  return (
    <button type="button" className="btn lg wide outline g-btn" disabled={disabled} onClick={() => goToGoogle(clientId, from)}>
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  )
}
