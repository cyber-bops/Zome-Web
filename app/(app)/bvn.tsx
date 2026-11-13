'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { call, Refused } from '@/lib/client'
import { Sheet } from './sheet'

// Adding a BVN, as the app has it (IdentityScenes): the eleven digits, the
// record to recognise ("Is this you?"), then the code sent to the phone the
// bank has for it (ADR-0052 §16). The legal name comes from the record.

type Rec = { first_name: string; middle_name?: string; last_name: string; date_of_birth?: string; phone: string; confirmation: string }
const words = (e: unknown) => !(e instanceof Refused) ? 'That didn’t work this time. Please try again.'
  // The API answers a bare 404 when identity checks are switched off.
  : e.status === 404 ? 'Adding a BVN isn’t available right now. Try again later.' : e.message
const born = (d?: string) => d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')) : ''

export function BvnSheet({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'number' | 'you' | 'code'>('number')
  const [bvn, setBvn] = useState('')
  const [rec, setRec] = useState<Rec | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const lookUp = async () => {
    if (bvn.length !== 11) { setProblem('Enter all 11 digits.'); return }
    setBusy(true); setProblem(null)
    try { setRec(await call<Rec>('me/bvn', 'POST', { bvn })); setCode(''); setStep('you') }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  const confirm = async () => {
    if (!rec || code.length !== 6) return
    setBusy(true); setProblem(null)
    try {
      await call('me/bvn/confirm', 'POST', { confirmation: rec.confirmation, code })
      router.refresh(); onClose(); onDone('BVN added · you can hold more and pay any account')
    } catch (e) {
      if (e instanceof Refused && e.type === 'ConfirmationExpired') { setStep('number'); setRec(null) }
      setProblem(words(e)); setCode('')
    } finally { setBusy(false) }
  }

  if (step === 'you' && rec) return (
    <Sheet eyebrow="Add your BVN" title="Is this you?" onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={() => { setRec(null); setBvn(''); setStep('number') }}>That’s not me</button><button type="button" className="btn" onClick={() => setStep('code')}>Yes, this is me</button></>}>
      <dl className="kv">
        <div><dt>First name</dt><dd>{rec.first_name}</dd></div>
        {rec.middle_name && <div><dt>Middle name</dt><dd>{rec.middle_name}</dd></div>}
        <div><dt>Last name</dt><dd>{rec.last_name}</dd></div>
        {rec.date_of_birth && <div><dt>Date of birth</dt><dd>{born(rec.date_of_birth)}</dd></div>}
      </dl>
      <p className="small">We’ll send a code to {rec.phone}, the phone your bank has for this BVN.</p>
    </Sheet>
  )
  if (step === 'code' && rec) return (
    <Sheet eyebrow="Add your BVN" title="Enter the code" lede={`We sent it to the phone your bank has for this BVN, ${rec.phone}.`} onClose={onClose}
      foot={<><button type="button" className="btn soft" disabled={busy} onClick={lookUp}>Send a new code</button><button type="button" className="btn" disabled={busy || code.length !== 6} onClick={confirm}>{busy ? 'Checking…' : 'Continue'}</button></>}>
      <label className="sr" htmlFor="bvn-code">Code</label>
      <div className="code-boxes">
        <input id="bvn-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} autoFocus
          onChange={e => { setProblem(null); setCode(e.target.value.replace(/\D/g, '').slice(0, 6)) }} onKeyDown={e => { if (e.key === 'Enter') confirm() }} />
        {Array.from({ length: 6 }, (_, i) => <span key={i} aria-hidden="true" className={`box${i === code.length ? ' next' : ''}`}>{code[i] ?? ''}</span>)}
      </div>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
  return (
    <Sheet eyebrow="Set up" title="Add your BVN" lede="We use it to confirm it’s really you. Can’t remember it? Dial *565*0#." onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={busy || bvn.length !== 11} onClick={lookUp}>{busy ? 'Checking…' : 'Continue'}</button></>}>
      <label className="label" htmlFor="bvn">Bank Verification Number</label>
      <input id="bvn" className="field mono big-digits" inputMode="numeric" autoComplete="off" maxLength={11} autoFocus placeholder="22100000000" value={bvn}
        onChange={e => { setProblem(null); setBvn(e.target.value.replace(/\D/g, '').slice(0, 11)) }} onKeyDown={e => { if (e.key === 'Enter') lookUp() }} />
      <p className="small">{bvn.length} of 11 digits</p>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}
