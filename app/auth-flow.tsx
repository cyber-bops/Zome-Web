'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { deviceName } from '@/lib/device'
import { forget, recall, remember, type Remembered } from '@/lib/remembered'
import { backFromGoogle, GoogleButton, type GoogleGrant } from './google'
import { ZomeMark } from './mark'

// Signing in and creating an account, as the iOS app does them (SignInModel,
// SignUpSheet): an email code to create an account and then a password; the
// password to log in (and, on a browser new to the account, the email code
// too: ADR-0055); Forgot password? proves the address with an email code
// and sets a new one; Continue with Google sends Google's ID token to the same
// /v1/auth/provider the apps use. Welcome back for whoever signed in last on
// this browser (ADR-0052 §7, ADR-0053 §4).

type Mode = 'log-in' | 'create'
type Step = 'choose' | 'code' | 'setUp' | 'reset'

const CODE = 6
const PASSWORD_MIN = 8

function words(err: unknown): string {
  return err instanceof Refused ? err.message : 'That didn’t go through. Try again.'
}

const looksLikeEmail = (e: string) => {
  const t = e.trim()
  return t.includes('@') && t.includes('.') && !t.startsWith('@') && !t.endsWith('@')
}

export function AuthFlow({ mode, googleClientId }: { mode: Mode; googleClientId?: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')
  const [known, setKnown] = useState<Remembered | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  // Forgot password?: the code proves the address, then a new password.
  const [resetting, setResetting] = useState(false)
  // Signed up with Google: no password to set, only the name, if Google gave none.
  const [viaGoogle, setViaGoogle] = useState(false)
  // The password was right, but this browser is new to the account (ADR-0055).
  const [newBrowser, setNewBrowser] = useState(false)

  useEffect(() => {
    if (mode !== 'log-in') return
    const r = recall()
    if (r) { setKnown(r); setEmail(r.email) }
    // Back from Google (google.tsx): sign in with the token it gave.
    const back = backFromGoogle()
    if (!back) return
    if (back.grant) withGoogle(back.grant)
    else if (back.from && back.from !== '/sign-in') router.replace(back.from)
    if (back.problem) setProblem(back.problem)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setProblem(null)
    try { await action() } catch (err) { setProblem(words(err)) } finally { setBusy(false) }
  }

  const device = () => deviceName(navigator.userAgent)

  // After any sign-in: remember who, for Welcome back, then in.
  async function arrive(name?: string) {
    let first = name ?? ''
    if (!first) {
      const p = await call<{ nickname?: string; full_name?: string }>('me/profile').catch(() => null)
      first = p?.nickname?.trim() || p?.full_name?.trim().split(/\s+/)[0] || ''
    }
    remember({ firstName: first, email: email.trim() })
    router.replace('/')
    router.refresh()
  }

  const logIn = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      try {
        await call('auth/sign-in', 'POST', { email: email.trim(), password, device: device() })
      } catch (err) {
        if (!(err instanceof Refused && err.type === 'NewDevice')) throw err
        setPassword(''); setCode(''); setResetting(false); setNewBrowser(true); setStep('code')
        return
      }
      setPassword('')
      await arrive(known?.firstName)
    })
  }

  const withGoogle = (grant: GoogleGrant) => run(async () => {
    const r = await call<{ new_account: boolean }>('auth/provider', 'POST', { provider: 'google', id_token: grant.idToken, device: device() })
    setEmail(grant.email)
    if (r.new_account) {
      setViaGoogle(true); setFirstName(grant.givenName); setLastName(grant.familyName); setStep('setUp')
      return
    }
    remember({ firstName: grant.givenName, email: grant.email })
    router.replace('/'); router.refresh()
  })

  const forgot = () => {
    setResetting(true)
    sendCode()
  }

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!looksLikeEmail(email)) {
      setProblem(email.trim() ? 'That doesn’t look like an email address.' : 'Enter your email address first, and we’ll send you a code.')
      return
    }
    run(async () => {
      await call('auth/start', 'POST', { email: email.trim(), device: device(), purpose: mode === 'create' ? 'create_account' : 'sign_in' })
      setCode('')
      setStep('code')
    })
  }

  const verify = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      try {
        const r = await call<{ new_account: boolean }>('auth/verify', 'POST', { email: email.trim(), code, device: device() })
        if (r.new_account) { setResetting(false); setStep('setUp'); return }
        if (resetting) { setPassword(''); setAgain(''); setStep('reset'); return }
        await arrive()
      } catch (err) {
        setCode('')
        throw err
      }
    })
  }

  const finish = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      if (!viaGoogle) await call('auth/password', 'POST', { password })
      const first = firstName.trim(), last = lastName.trim()
      if (first || last) {
        // A new profile needs a timezone: the path's days are local days.
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos'
        await call('me/profile', 'PUT', { ...(first ? { nickname: first } : {}), full_name: [first, last].filter(Boolean).join(' '), timezone }).catch(() => {})
      }
      setPassword(''); setAgain('')
      await arrive(first)
    })
  }

  const setNew = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      await call('auth/password', 'POST', { password })
      setPassword(''); setAgain(''); setResetting(false)
      await arrive(known?.firstName)
    })
  }

  const notYou = () => { forget(); setKnown(null); setEmail(''); setPassword(''); setProblem(null) }

  const passwordProblem = !password ? null
    : password.length < PASSWORD_MIN ? `Use at least ${PASSWORD_MIN} characters.`
    : again && again !== password ? 'Those two don’t match.' : null
  const digits = code.slice(0, CODE)
  const stepsOf = mode === 'create' && !viaGoogle ? 3 : 2
  const at = step === 'choose' ? 1 : step === 'code' ? 2 : viaGoogle ? 2 : 3
  const google = googleClientId && <GoogleButton clientId={googleClientId} from={mode === 'create' ? '/sign-up' : '/sign-in'} disabled={busy} />

  const secret = (id: string, label: string, value: string, set: (v: string) => void, autoComplete: string, hint?: string) => (
    <div className="field-row">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} className="field" type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value}
          onChange={e => { set(e.target.value); setProblem(null) }} required />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  )

  return (
    <main className="auth">
      <aside className="auth-side" aria-hidden="true">
        <div className="tape"><div className="paper">
          <div className="ph"><ZomeMark /><b>ZOME CARE PURSE</b><span>READY WHEN CARE IS</span></div>
          <div className="dash" />
          <div className="tot">
            <span className="k">SAVE FOR CARE</span><span>8% A YEAR</span>
            <span className="k">FAMILY CAN ADD</span><span>BY TRANSFER</span>
            <span className="k">PAY ANY CLINIC</span><span>IN NIGERIA</span>
          </div>
          <div className="dash" />
          <div className="bars" />
          <p className="pf">KEPT FOR CARE</p>
        </div></div>
      </aside>
      <section className="auth-main">
        <div className="auth-form">
          <div className="brand"><span className="badge"><ZomeMark /></span>Zome</div>
          {(mode === 'create' || step !== 'choose') && (
            <>
              <p className="steps-lbl">Step {at} of {stepsOf}</p>
              <div className="steps" aria-hidden="true">{Array.from({ length: stepsOf }, (_, i) => <i key={i} className={i < at ? 'on' : ''} />)}</div>
            </>
          )}

          {step === 'choose' && mode === 'log-in' && (
            <form onSubmit={logIn} noValidate>
              <h1 className="auth-title">{known?.firstName ? `Welcome back, ${known.firstName}` : 'Welcome back'}</h1>
              <p className="auth-sub">Log in to your Care Purse.</p>
              {known ? (
                <div className="who-chip">
                  <span className="avatar">{(known.firstName || known.email)[0]?.toUpperCase()}</span>
                  <div className="grow"><b>{known.firstName || 'Your account'}</b><span>{known.email}</span></div>
                  <button type="button" className="link-btn" onClick={notYou}>Not you?</button>
                </div>
              ) : (
                <div className="field-row">
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" className="field" type="email" inputMode="email" autoComplete="email" value={email}
                    onChange={e => { setEmail(e.target.value); setProblem(null) }} required autoFocus />
                </div>
              )}
              {secret('password', 'Password', password, setPassword, 'current-password')}
              <p className="forgot"><button type="button" className="link-btn" disabled={busy} onClick={forgot}>Forgot password?</button></p>
              {problem && <p className="problem" role="alert">{problem}</p>}
              <button className="btn lg wide" type="submit" disabled={busy || !looksLikeEmail(email) || !password}>
                {busy ? 'Signing in…' : 'Log in'}
              </button>
              {google && <><div className="or">or</div>{google}</>}
              <p className="auth-alt">New to Zome? <Link href="/sign-up" className="link-btn">Create your account</Link></p>
            </form>
          )}

          {step === 'choose' && mode === 'create' && (
            <form onSubmit={sendCode} noValidate>
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-sub">Your plan and your progress, kept in one account.</p>
              <div className="field-row">
                <label className="label" htmlFor="email">Email</label>
                <input id="email" className="field" type="email" inputMode="email" autoComplete="email" value={email}
                  onChange={e => { setEmail(e.target.value); setProblem(null) }} required autoFocus />
              </div>
              {problem && <p className="problem" role="alert">{problem}</p>}
              <button className="btn lg wide" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Continue with email'}</button>
              {google && <><div className="or">or</div>{google}</>}
              <p className="auth-alt">Already have an account? <Link href="/sign-in" className="link-btn">Log in</Link></p>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verify}>
              <h1 className="auth-title">{resetting ? 'Reset your password' : newBrowser ? 'Is this you?' : 'We sent you a code'}</h1>
              <p className="auth-sub">{newBrowser ? 'This browser is new to your account. To finish logging in, enter' : 'Please enter'} the {CODE}-digit code we sent to <strong>{email.trim()}</strong>.</p>
              <div className="field-row">
                <label className="sr" htmlFor="code">Verification code</label>
                <div className="code-boxes">
                  <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={CODE} value={digits}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, CODE)); setProblem(null) }} autoFocus required />
                  {Array.from({ length: CODE }, (_, i) => (
                    <span key={i} aria-hidden="true" className={`box${i === digits.length ? ' next' : ''}`}>{digits[i] ?? ''}</span>
                  ))}
                </div>
              </div>
              {problem && <p className="problem" role="alert">{problem}</p>}
              <button className="btn lg wide" type="submit" disabled={busy || code.length !== CODE}>{busy ? 'Checking…' : 'Continue'}</button>
              <p className="auth-alt">
                <button type="button" className="link-btn" disabled={busy} onClick={() => sendCode()}>Resend code</button>
                {' · '}
                <button type="button" className="link-btn" onClick={() => { setProblem(null); setResetting(false); setNewBrowser(false); setStep('choose') }}>Back</button>
              </p>
            </form>
          )}

          {step === 'setUp' && (
            <form onSubmit={finish}>
              <h1 className="auth-title">Complete account setup</h1>
              <p className="auth-sub">{viaGoogle ? 'Check your name, and you’re in.' : 'Set a password, and you’re in.'}</p>
              <div className="grid2">
                <div className="field-row">
                  <label className="label" htmlFor="first">First name</label>
                  <input id="first" className="field" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="field-row">
                  <label className="label" htmlFor="last">Last name</label>
                  <input id="last" className="field" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              {!viaGoogle && secret('new-password', 'Password', password, setPassword, 'new-password', `At least ${PASSWORD_MIN} characters`)}
              {!viaGoogle && secret('again', 'Confirm password', again, setAgain, 'new-password', 'Type it again')}
              {((!viaGoogle && passwordProblem) || problem) && <p className="problem" role="alert">{(!viaGoogle && passwordProblem) || problem}</p>}
              <button className="btn lg wide" type="submit" disabled={busy || (!viaGoogle && (password.length < PASSWORD_MIN || password !== again))}>
                {busy ? 'Saving…' : 'Confirm'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={setNew}>
              <h1 className="auth-title">Choose a new password</h1>
              <p className="auth-sub">For <strong>{email.trim()}</strong>. This signs you out everywhere else.</p>
              {secret('new-password', 'New password', password, setPassword, 'new-password', `At least ${PASSWORD_MIN} characters`)}
              {secret('again', 'Confirm password', again, setAgain, 'new-password', 'Type it again')}
              {(passwordProblem || problem) && <p className="problem" role="alert">{passwordProblem ?? problem}</p>}
              <button className="btn lg wide" type="submit" disabled={busy || password.length < PASSWORD_MIN || password !== again}>
                {busy ? 'Saving…' : 'Save and log in'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
