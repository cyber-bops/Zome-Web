'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { call, Refused } from '@/lib/client'
import { PinSheet } from '../pin'
import { Sheet } from '../sheet'

// Security and email settings in You: the password, the Care Purse PIN
// (change it, set it, or reset a forgotten one with a code sent by email), and
// whether tips and reminders come by email. Each change is also mailed to the
// person by Zome Security (ADR-0059), so a change they didn't make doesn't go
// unnoticed.

const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t work this time. Please try again.'

export function Security({ pin, tips }: { pin: { set: boolean } | null; tips: boolean | null }) {
  const [open, setOpen] = useState<null | 'password' | 'pin-change' | 'pin-set' | 'pin-forgot'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const done = (t: string) => { setOpen(null); setToast(t); setTimeout(() => setToast(null), 3200) }
  const close = () => setOpen(null)

  return (
    <>
      <section className="sheet-paper">
        <h2>Password</h2>
        <div className="row">
          <span className="grow"><span>Sign-in password</span><span className="small sub">Sign in with your email and a password, or with an email code.</span></span>
          <button type="button" className="btn soft" onClick={() => setOpen('password')}>Change password</button>
        </div>
      </section>

      {pin && (
        <section className="sheet-paper">
          <h2>Care Purse PIN</h2>
          <div className="row">
            <span className="grow"><span>Payment PIN</span><span className="small sub">Your 4-digit PIN approves every payment from Care Purse.</span></span>
            {pin.set
              ? <button type="button" className="btn soft" onClick={() => setOpen('pin-change')}>Change PIN</button>
              : <button type="button" className="btn" onClick={() => setOpen('pin-set')}>Set a PIN</button>}
          </div>
          {pin.set && (
            <div className="row">
              <span className="grow"><span>Forgot your PIN?</span><span className="small sub">We’ll email you a code to choose a new one.</span></span>
              <button type="button" className="btn soft" onClick={() => setOpen('pin-forgot')}>Reset PIN</button>
            </div>
          )}
        </section>
      )}

      {tips !== null && <EmailPrefs on={tips} onDone={t => { setToast(t); setTimeout(() => setToast(null), 3200) }} />}

      {open === 'password' && <PasswordSheet onClose={close} onDone={done} />}
      {open === 'pin-change' && <PinChange onClose={close} onDone={done} />}
      {open === 'pin-set' && <PinSet onClose={close} onDone={done} />}
      {open === 'pin-forgot' && <PinForgot onClose={close} onDone={done} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

function EmailPrefs({ on, onDone }: { on: boolean; onDone: (t: string) => void }) {
  const [value, setValue] = useState(on)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const flip = async () => {
    const next = !value
    setBusy(true); setProblem(null); setValue(next)
    try { await call('me/mail-preferences', 'PUT', { tips: next }); onDone(next ? 'Tips and reminders are on' : 'Tips and reminders are off') }
    catch (e) { setValue(!next); setProblem(words(e)) } finally { setBusy(false) }
  }
  return (
    <section className="sheet-paper">
      <h2>Emails</h2>
      <div className="row">
        <span className="grow"><span id="tips-label">Tips and reminders</span><span className="small sub">Help getting started, and the odd nudge. Emails about your account’s security, codes and payments always come.</span></span>
        <button type="button" role="switch" aria-checked={value} aria-labelledby="tips-label" className={`switch-btn${value ? ' on' : ''}`} disabled={busy} onClick={flip}><i /></button>
      </div>
      {problem && <p className="err" role="alert">{problem}</p>}
    </section>
  )
}

function PasswordSheet({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const save = async () => {
    if (next.length < 8) { setProblem('Use at least 8 characters.'); return }
    if (next !== again) { setProblem('The two new passwords are different.'); return }
    setBusy(true); setProblem(null)
    try {
      await call('auth/password', 'POST', { password: next, current_password: current })
      router.refresh()
      onDone('Password saved. Other browsers were signed out.')
    } catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  return (
    <Sheet eyebrow="Password" title="Change your password" lede="Saving it signs out every other browser." onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={busy || !next || !again} onClick={save}>{busy ? 'Saving…' : 'Save password'}</button></>}>
      <div className="field-row">
        <label className="label" htmlFor="pw-current">Current password</label>
        <input id="pw-current" className="field" type="password" autoComplete="current-password" value={current} onChange={e => { setProblem(null); setCurrent(e.target.value) }} />
        <p className="small">Leave this empty if you’ve never had one, or you signed in with a code in the last 10 minutes.</p>
      </div>
      <div className="field-row">
        <label className="label" htmlFor="pw-new">New password</label>
        <input id="pw-new" className="field" type="password" autoComplete="new-password" minLength={8} value={next} onChange={e => { setProblem(null); setNext(e.target.value) }} />
      </div>
      <div className="field-row">
        <label className="label" htmlFor="pw-again">New password again</label>
        <input id="pw-again" className="field" type="password" autoComplete="new-password" value={again} onChange={e => { setProblem(null); setAgain(e.target.value) }}
          onKeyDown={e => { if (e.key === 'Enter') save() }} />
      </div>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

/** Change the PIN: the current one, then the new one twice. */
function PinChange({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const [step, setStep] = useState<'current' | 'new' | 'again'>('current')
  const [current, setCurrent] = useState('')
  const [first, setFirst] = useState('')
  const [note, setNote] = useState<string | null>(null)
  if (step === 'current') return <PinSheet eyebrow="Change PIN" title="Enter your current PIN" lede={note ?? undefined} onClose={onClose}
    onPin={async p => { setNote(null); setCurrent(p); setStep('new'); return null }} />
  if (step === 'new') return <PinSheet eyebrow="Change PIN" title="Choose a new PIN" lede={note ?? 'Avoid four of the same digit, or a run like 1234.'} onClose={onClose}
    onPin={async p => { setNote(null); setFirst(p); setStep('again'); return null }} />
  return <PinSheet eyebrow="Change PIN" title="Enter the new PIN again" busyWord="Saving…" onClose={onClose}
    onPin={async p => {
      if (p !== first) { setNote('Those two PINs were different. Choose it again.'); setStep('new'); return null }
      try { await call('vault/pin/change', 'POST', { pin: current, new_pin: p }); onDone('PIN changed'); return null }
      catch (e) {
        const w = words(e)
        if (/isn't right|isn’t right|wrong/i.test(w)) { setNote('That current PIN wasn’t right. Try again.'); setStep('current'); return null }
        setNote(w); setStep('new'); return null
      }
    }} />
}

/** Set the first PIN. */
function PinSet({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const [step, setStep] = useState<'new' | 'again'>('new')
  const [first, setFirst] = useState('')
  const [note, setNote] = useState<string | null>(null)
  if (step === 'new') return <PinSheet eyebrow="Payment PIN" title="Choose a PIN" lede={note ?? 'Only you can approve a payment, with your 4-digit PIN.'} onClose={onClose}
    onPin={async p => { setNote(null); setFirst(p); setStep('again'); return null }} />
  return <PinSheet eyebrow="Payment PIN" title="Enter it again" busyWord="Saving…" onClose={onClose}
    onPin={async p => {
      if (p !== first) { setNote('Those two PINs were different. Choose it again.'); setStep('new'); return null }
      try { await call('vault/pin', 'POST', { pin: p }); onDone('PIN set'); return null }
      catch (e) { setNote(words(e)); setStep('new'); return null }
    }} />
}

/** A forgotten PIN: a code by email, then a new PIN twice. */
function PinForgot({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const [step, setStep] = useState<'ask' | 'code' | 'new' | 'again'>('ask')
  const [code, setCode] = useState('')
  const [first, setFirst] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const send = async () => {
    setBusy(true); setNote(null)
    try { await call('vault/pin/reset/start', 'POST', {}); setCode(''); setStep('code') }
    catch (e) { setNote(words(e)) } finally { setBusy(false) }
  }
  if (step === 'ask') return (
    <Sheet eyebrow="Reset PIN" title="Reset your PIN" lede="We’ll email you a code. After a reset, payments to bank accounts wait 24 hours, to keep your money safe." onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Email me a code'}</button></>}>
      {note && <p className="err" role="alert">{note}</p>}
    </Sheet>
  )
  if (step === 'code') return (
    <Sheet eyebrow="Reset PIN" title="Enter the code" lede="We sent a 6-digit code to your email. It works for 10 minutes." onClose={onClose}
      foot={<><button type="button" className="btn soft" disabled={busy} onClick={send}>Send again</button><button type="button" className="btn" disabled={code.length !== 6} onClick={() => { setNote(null); setStep('new') }}>Continue</button></>}>
      <label className="label" htmlFor="pin-reset-code">Code</label>
      <input id="pin-reset-code" className="field mono big-digits" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code}
        onChange={e => { setNote(null); setCode(e.target.value.replace(/\D/g, '').slice(0, 6)) }}
        onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) setStep('new') }} />
      {note && <p className="err" role="alert">{note}</p>}
    </Sheet>
  )
  if (step === 'new') return <PinSheet eyebrow="Reset PIN" title="Choose a new PIN" lede={note ?? 'Avoid four of the same digit, or a run like 1234.'} onClose={onClose}
    onPin={async p => { setNote(null); setFirst(p); setStep('again'); return null }} />
  return <PinSheet eyebrow="Reset PIN" title="Enter the new PIN again" busyWord="Saving…" onClose={onClose}
    onPin={async p => {
      if (p !== first) { setNote('Those two PINs were different. Choose it again.'); setStep('new'); return null }
      try { await call('vault/pin/reset', 'POST', { code, new_pin: p }); onDone('PIN reset. Bank transfers resume in 24 hours.'); return null }
      catch (e) {
        const w = words(e)
        if (/code/i.test(w)) { setNote(w); setStep('code'); return null }
        setNote(w); setStep('new'); return null
      }
    }} />
}
