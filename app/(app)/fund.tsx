'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { Mandate, TopUp } from '@/server/api'
import { Sheet } from './sheet'
import { HangingTicket } from './ticket'

// Adding money, two ways, as the app offers them:
// - from the person's linked bank account by direct debit (ADR-0025): the fee
//   shown first, then one tap (/v1/vault/debits/quote, then /v1/vault/debits);
// - by bank transfer to a one-time account Bachs opens (ADR-0024).
// Without a link, choosing the bank account offers to link one.

const MAX_NAIRA = 5_000_000
const QUICK = [2000, 5000, 10000, 20000]
const lagosTime = (iso: string) => new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(iso))
const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t go through. Try again.'
type Way = 'debit' | 'transfer'
type Debit = { id: string; state: string; amount_kobo: number; fee_kobo: number; total_kobo: number }

export function FundSheet({ onClose, onVerify, onLink, linked, onDone }: {
  onClose: () => void; onVerify?: () => void; onLink?: () => void; linked?: Mandate; onDone?: (t: string) => void
}) {
  const router = useRouter()
  const live = linked?.state === 'active'
  const waiting = linked && ['opening', 'awaiting_authorisation'].includes(linked.state)
  const paused = linked?.state === 'suspended'
  const [way, setWay] = useState<Way>(live ? 'debit' : 'transfer')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [verify, setVerify] = useState(false)
  const [quote, setQuote] = useState<{ fee_kobo: number; total_kobo: number } | null>(null)
  const [topUp, setTopUp] = useState<TopUp | null>(null)
  const [debit, setDebit] = useState<Debit | null>(null)
  const [copied, setCopied] = useState(false)
  // One key per way and amount, so a retry after a dropped connection never adds money twice.
  const key = useRef<{ for: string; key: string } | null>(null)

  const amount = Number(typed || '0')
  const set = (next: string) => {
    setProblem(null)
    const digits = next.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (Number(digits || '0') <= MAX_NAIRA) setTyped(digits)
  }

  // The direct debit's fee, before anything moves.
  useEffect(() => {
    setQuote(null)
    if (!live || way !== 'debit' || amount < 100) return
    const t = setTimeout(() => call<{ fee_kobo: number; total_kobo: number }>('vault/debits/quote', 'POST', { amount_kobo: amount * 100 })
      .then(setQuote, e => setProblem(words(e))), 250)
    return () => clearTimeout(t)
  }, [live, way, amount])

  const keyFor = () => {
    const id = `${way}:${typed}`
    if (!key.current || key.current.for !== id) key.current = { for: id, key: `web-${crypto.randomUUID()}` }
    return key.current.key
  }

  const go = async () => {
    if (way === 'debit' && !live) { if (!waiting && !paused) onLink?.(); return }
    if (amount < 100) { setProblem('Add at least ₦100.'); return }
    setBusy(true); setProblem(null)
    try {
      if (way === 'debit') {
        setDebit(await call<Debit>('vault/debits', 'POST', { amount_kobo: amount * 100 }, { 'Idempotency-Key': keyFor() }))
      } else {
        setTopUp(await call<TopUp>('vault/top-ups', 'POST', { amount_kobo: amount * 100 }, { 'Idempotency-Key': keyFor() }))
      }
      router.refresh()
    } catch (err) {
      setProblem(words(err))
      setVerify(err instanceof Refused && err.type === 'VerifyFirst')
    } finally { setBusy(false) }
  }

  if (debit && linked) return (
    <Sheet eyebrow="Add money" title={`${naira(debit.amount_kobo)} on its way`} onClose={() => { onClose(); onDone?.(`${naira(debit.amount_kobo)} on its way from ${linked.bank_name}`) }}
      foot={<button type="button" className="btn span" onClick={() => { onClose(); onDone?.(`${naira(debit.amount_kobo)} on its way from ${linked.bank_name}`) }}>Done</button>}>
      <HangingTicket eyebrow="ADDED" headline="Added." stamp="ADDED" green
        fields={[['From', `${linked.bank_name} ··${linked.account_number.slice(-4)}`], ['Into', 'Care Purse']]}
        reference={debit.id.slice(0, 8).toUpperCase()} title="On its way"
        cells={[{ k: 'Amount', v: naira(debit.amount_kobo) }, { k: 'Fee', v: naira(debit.fee_kobo) }]} />
    </Sheet>
  )

  if (topUp) return (
    <Sheet eyebrow="Add money" title="Send a transfer" onClose={onClose}
      lede={topUp.account_number ? undefined : 'Setting up your account details. They’ll show on your purse shortly.'}
      foot={<button type="button" className="btn span" onClick={onClose}>Done</button>}>
      {topUp.account_number && (
        <>
          <div className="big-amt"><span className="lbl">Send exactly</span><b>{naira(topUp.total_kobo)}</b></div>
          <dl className="kv">
            <div><dt>Bank</dt><dd>{topUp.bank_name}</dd></div>
            <div><dt>Account</dt><dd>{topUp.account_number}
              <button type="button" className="copy" onClick={() => navigator.clipboard?.writeText(topUp.account_number ?? '').then(() => setCopied(true), () => {})}>{copied ? 'Copied' : 'Copy'}</button></dd></div>
            <div><dt>Name</dt><dd>{topUp.account_name}</dd></div>
            {topUp.fee_kobo > 0 && <div><dt>Includes fee</dt><dd>{naira(topUp.fee_kobo)}</dd></div>}
          </dl>
          <p className="clock"><span>One transfer only</span><span>Valid until {lagosTime(topUp.expires_at)}</span></p>
        </>
      )}
    </Sheet>
  )

  const debitLine = live ? `${linked!.bank_name} ··${linked!.account_number.slice(-4)}, by direct debit`
    : waiting ? 'Your bank is approving the link. This can take up to 3 days.'
    : paused ? 'Paused by your bank.'
    : 'Link your bank account, then add money in one tap.'
  const goWord = busy ? (way === 'debit' ? 'Adding…' : 'Setting up…')
    : way === 'debit' && !live ? (waiting || paused ? 'Waiting for your bank' : 'Link your bank account')
    : way === 'debit' ? (amount ? `Add ${naira(amount * 100, true)} now` : 'Add money') : 'Continue'

  return (
    <Sheet eyebrow="Care Purse" title="Add money" onClose={onClose}
      foot={<>
        <button type="button" className="btn soft" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={busy || (way === 'debit' ? (live ? amount === 0 : !!(waiting || paused)) : amount === 0)} onClick={go}>{goWord}</button>
      </>}>
      <label className="sr" htmlFor="amount">Amount</label>
      <div className="amt">
        <span>₦</span>
        <input id="amount" inputMode="numeric" autoComplete="off" placeholder="0" autoFocus value={amount ? amount.toLocaleString('en-NG') : ''}
          onChange={e => set(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); go() } }} />
      </div>
      <div className="quick">
        {QUICK.map(n => <button key={n} type="button" aria-pressed={amount === n} onClick={() => set(String(n))}>₦{n.toLocaleString('en-NG')}</button>)}
      </div>
      <div className="ways" role="radiogroup" aria-label="How">
        <button type="button" role="radio" aria-checked={way === 'debit'} className="way" onClick={() => { setProblem(null); setWay('debit') }}>
          <i aria-hidden="true" /><span className="grow"><b>From your bank account</b><span>{debitLine}</span>
            {live && way === 'debit' && quote && <span className="fee">{quote.fee_kobo > 0 ? `${naira(quote.fee_kobo)} fee · ` : ''}{naira(quote.total_kobo)} from your bank</span>}</span>
          {live && <em>One tap</em>}
        </button>
        <button type="button" role="radio" aria-checked={way === 'transfer'} className="way" onClick={() => { setProblem(null); setWay('transfer') }}>
          <i aria-hidden="true" /><span className="grow"><b>Bank transfer</b><span>From any bank app, to a one-time account.</span></span>
        </button>
      </div>
      {problem && <p className="err" role="alert">{problem}</p>}
      {verify && onVerify && <button type="button" className="btn soft top-gap wide" onClick={onVerify}>Add your BVN</button>}
    </Sheet>
  )
}
