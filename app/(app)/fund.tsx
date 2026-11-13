'use client'

import { useRouter } from 'next/navigation'
import { BankLogo } from '../bank-logo'
import { Amount, NumPad, usePhone } from '../amount'
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
  const [choosing, setChoosing] = useState(false)
  const phone = usePhone()
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

  const debitLine = live ? `${linked!.bank_name} ··${linked!.account_number.slice(-4)}`
    : waiting ? 'Your bank is approving the link'
    : paused ? 'Paused by your bank'
    : 'Link it first'
  const goWord = busy ? (way === 'debit' ? 'Adding…' : 'Setting up…')
    : way === 'debit' && !live ? (waiting || paused ? 'Waiting for your bank' : 'Link your bank account')
    : way === 'debit' ? (amount ? `Add ${naira(amount * 100, true)} now` : 'Add money') : 'Continue'

  const chip = way === 'debit' && linked ? `${linked.bank_name.split(' ')[0]} ··${linked.account_number.slice(-4)}` : way === 'debit' ? 'Your bank' : 'Bank transfer'
  const fee = way === 'debit' ? (quote ? naira(quote.fee_kobo) : '—') : 'Shown next'
  const off = busy || (way === 'debit' ? (live ? amount === 0 : !!(waiting || paused)) : amount === 0)

  // The mockup's Add money: a screen of its own on a phone, the same layout
  // in a floating panel on a computer. "You add", the figure (it shrinks as
  // it grows) with the way as a chip beside it; From and Fee in one block;
  // the number pad; one button. The chip opens the choice of way.
  return (
    <div className="ps-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="padscreen" role="dialog" aria-modal="true" aria-label="Add money">
        <div className="ps-bar">
          <button type="button" className="ps-back" onClick={onClose} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <h2>Add money</h2><span />
        </div>
        <div className="ps-body">
          <span className="lbl">You add</span>
          <Amount id="amount" digits={typed} onDigits={set} onEnter={go} max={MAX_NAIRA} padElsewhere autoFocus={!phone} />
          <p className="ps-note">{amount > 0 && way === 'debit' && quote ? `${naira(quote.fee_kobo)} fee` : '\u00a0'}</p>
          <div className="quick">
            {QUICK.map(n => <button key={n} type="button" aria-pressed={amount === n} onClick={() => set(String(n))}>₦{n.toLocaleString('en-NG')}</button>)}
          </div>
          {problem && <p className="err" role="alert">{problem}</p>}
          {verify && onVerify && <button type="button" className="btn soft top-gap wide" onClick={onVerify}>Add your BVN</button>}
        </div>
        <button type="button" className="way-bar" onClick={() => setChoosing(true)} aria-haspopup="dialog">
          {way === 'debit' && linked ? <BankLogo code={linked.bank_code} name={linked.bank_name} /> : <span className="bank-logo" aria-hidden="true">⇄</span>}
          <span className="grow"><b>{way === 'debit' ? (linked ? `${linked.bank_name} ··${linked.account_number.slice(-4)}` : 'Your bank account') : 'Bank transfer'}</b>
            <span>{way === 'debit' ? (live ? 'Direct debit' : debitLine) : 'From any bank app'}</span></span>
          <span className="change">Change</span>
        </button>
        {phone && <NumPad digits={typed} onDigits={set} max={MAX_NAIRA} />}
        <div className="ps-cta"><button type="button" className="btn lg wide" disabled={off} onClick={go}>{goWord}</button></div>

        {choosing && (
          <>
            <div className="ps-scrim" onClick={() => setChoosing(false)} />
            <div className="ps-sheet" role="dialog" aria-label="Add money from">
              <span className="grab" aria-hidden="true" />
              <h3>Add money from</h3>
              <div className="ways" role="radiogroup" aria-label="How">
                <button type="button" role="radio" aria-checked={way === 'debit'} className="way" onClick={() => { setProblem(null); setWay('debit') }}>
                  <i aria-hidden="true" />{linked && <BankLogo code={linked.bank_code} name={linked.bank_name} />}<span className="grow"><b>{live ? `${linked!.bank_name} ··${linked!.account_number.slice(-4)}` : 'Your bank account'}</b><span>{live ? 'Direct debit' : debitLine}</span></span>
                </button>
                <button type="button" role="radio" aria-checked={way === 'transfer'} className="way" onClick={() => { setProblem(null); setWay('transfer') }}>
                  <i aria-hidden="true" /><span className="grow"><b>Bank transfer</b><span>From any bank app</span></span>
                </button>
              </div>
              <button type="button" className="btn lg wide" onClick={() => setChoosing(false)}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
