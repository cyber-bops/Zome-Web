'use client'

import { useRouter } from 'next/navigation'
import { Amount, NumPad, usePhone } from '../amount'
import { useCallback, useEffect, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import { PinSheet } from './pin'
import { TransferFlow } from './transfer'
import { Sheet } from './sheet'
import { HangingTicket } from './ticket'

// Paying a business on Zome from the Care Purse (ADR-0036): find the
// provider, the amount, the PIN; then the receipt, stamped. A person with no
// PIN yet chooses one first, as the app has them do.

export type Merchant = { id: string; name: string; category: string; address: string; hospital?: boolean; bank?: string; fee?: number }
type Paid = { bill: { receipt: string; merchant: string; amount_kobo: number; created_at: string }; cashback_kobo: number; fee_kobo?: number; sending?: boolean }
const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t go through. Try again.'
const initials = (n: string) => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

/** `fund`: pay from a Care Fund instead of Care Purse (ADR-0054); only businesses in the network. */
export function PaySheet({ balance, onClose, onPaid, fund }: { balance: number; onClose: () => void; onPaid: (t: string) => void; fund?: { id: string; title: string } }) {
  const from = fund ? 'the fund' : 'your Care Purse'
  const router = useRouter()
  const [step, setStep] = useState<'find' | 'amount' | 'choose' | 'again' | 'pin' | 'paid' | 'bank'>('find')
  const [q, setQ] = useState('')
  const [list, setList] = useState<Merchant[] | null>([])
  const [to, setTo] = useState<Merchant | null>(null)
  const [typed, setTyped] = useState('')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [first, setFirst] = useState('')
  const [paid, setPaid] = useState<Paid | null>(null)
  const key = useRef<{ for: string; key: string } | null>(null)
  const amount = Number(typed || '0') * 100
  const phone = usePhone()

  // The network's businesses, as the person types.
  useEffect(() => {
    if (step !== 'find') return
    if (!q.trim()) { setList([]); return }
    const t = setTimeout(() => {
      setList(null)
      const term = encodeURIComponent(q.trim())
      Promise.all([
        call<{ merchants: Merchant[] }>(`vault/merchants?q=${term}`).then(r => r.merchants),
        // A fund may also pay a hospital outside the network that Zome confirmed (ADR-0054 §3).
        fund ? call<{ hospitals: { id: string; name: string; kind: string; address: string; bank_name: string }[]; fee_kobo?: number }>(`me/care-fund/hospitals?q=${term}`)
          .then(r => r.hospitals.map(h => ({ id: h.id, name: h.name, category: h.kind, address: h.address, hospital: true, bank: h.bank_name, fee: r.fee_kobo ?? 0 })), () => [] as Merchant[]) : Promise.resolve([] as Merchant[]),
      ]).then(([a, b]) => setList([...a, ...b]), e => { setList([]); setProblem(words(e)) })
    }, 250)
    return () => clearTimeout(t)
  }, [q, step])

  const toAmount = async () => {
    if (amount < 10000) { setProblem('Pay at least ₦100.'); return }
    if (amount + (to?.hospital ? to.fee ?? 0 : 0) > balance) { setProblem(fund ? `The fund has ${naira(balance)}.` : `Your Care Purse has ${naira(balance)}. Fund it first.`); return }
    setProblem(null)
    try {
      const st = await call<{ set: boolean; locked_until?: string }>('vault/pin')
      if (st.locked_until && Date.parse(st.locked_until) > Date.now()) { setProblem('Your PIN is locked for now after too many tries. Try again later.'); return }
      setStep(st.set ? 'pin' : 'choose')
    } catch (e) { setProblem(words(e)) }
  }

  const pay = useCallback(async (pin: string): Promise<string | null> => {
    if (!to) return 'Choose who to pay.'
    const id = `${to.id}:${amount}`
    if (!key.current || key.current.for !== id) key.current = { for: id, key: `web-${crypto.randomUUID()}` }
    try {
      if (fund && to.hospital) {
        const t = await call<{ transfer: { id: string; amount_kobo: number; fee_kobo: number; status: string; reason?: string; created_at: string } }>(`me/care-fund/${fund.id}/pay-hospital/${to.id}`, 'POST', { amount_kobo: amount, pin, note: note.trim() }, { 'Idempotency-Key': key.current.key })
        if (t.transfer.status === 'failed') { setProblem(t.transfer.reason || 'The bank couldn’t take it. The money is back in the fund.'); setStep('amount'); return null }
        setPaid({ bill: { receipt: t.transfer.id.slice(0, 8).toUpperCase(), merchant: to.name, amount_kobo: t.transfer.amount_kobo, created_at: t.transfer.created_at }, cashback_kobo: 0, fee_kobo: t.transfer.fee_kobo, sending: t.transfer.status !== 'paid' })
        setStep('paid'); router.refresh(); onPaid(`${naira(t.transfer.amount_kobo)} on its way to ${to.name}`)
        return null
      }
      const r = await call<Paid>(fund ? `me/care-fund/${fund.id}/pay/${to.id}` : `vault/merchants/${to.id}/pay`, 'POST', { amount_kobo: amount, pin, note: note.trim() }, { 'Idempotency-Key': key.current.key })
      setPaid({ ...r, cashback_kobo: r.cashback_kobo ?? 0 }); setStep('paid'); router.refresh()
      onPaid(`Paid ${naira(r.bill.amount_kobo)} to ${r.bill.merchant}`)
      return null
    } catch (e) {
      if (e instanceof Refused && e.status >= 400 && e.status < 500 && !/pin/i.test(e.message)) { setProblem(e.message); setStep('amount'); return null }
      return words(e)
    }
  }, [to, amount, note, router, onPaid, fund])

  if (step === 'bank') return <TransferFlow balance={balance} onClose={onClose} onPaid={onPaid} onBack={() => setStep('find')} />
  if (step === 'choose') return (
    <PinSheet eyebrow="Payment PIN" title="Choose a PIN" lede={problem ?? 'Nothing leaves without your 4-digit PIN.'} onClose={onClose}
      onPin={async p => { setProblem(null); setFirst(p); setStep('again'); return null }} />
  )
  if (step === 'again') return (
    <PinSheet eyebrow="Payment PIN" title="Enter it again" lede="To make sure it’s the one you meant." onClose={onClose} busyWord="Saving…"
      onPin={async p => {
        if (p !== first) { setStep('choose'); setProblem('Those PINs didn’t match. Choose one again.'); return 'Those PINs didn’t match.' }
        try { await call('vault/pin', 'POST', { pin: p }); return await pay(p) } catch (e) { setStep('choose'); return words(e) }
      }} />
  )
  if (step === 'pin' && to) return (
    <PinSheet eyebrow={`${to.name} · ${naira(amount)}`} title="Enter your PIN" onClose={onClose} busyWord="Paying…" onPin={pay} />
  )
  if (step === 'paid' && paid) return (
    <Sheet eyebrow="Paid" title={paid.bill.merchant} onClose={onClose}
      foot={<button type="button" className="btn span" onClick={onClose}>Done</button>}>
      <HangingTicket eyebrow={paid.sending ? 'SENT' : 'PAID'} headline={paid.sending ? 'On its way.' : 'Paid.'} stamp={paid.sending ? undefined : 'PAID'}
        fields={[['Receipt', paid.bill.receipt], ['Date', new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(paid.bill.created_at))]]}
        reference={paid.bill.receipt} title={paid.sending ? 'On its way to the bank' : 'Paid'}
        cells={[
          { k: 'To', v: paid.bill.merchant, full: true },
          { k: 'Amount', v: naira(paid.bill.amount_kobo) },
          paid.cashback_kobo > 0 ? { k: 'Cashback', v: `+${naira(paid.cashback_kobo)}`, good: true } : paid.fee_kobo ? { k: 'Fee', v: naira(paid.fee_kobo) } : { k: 'From', v: fund ? 'Care Fund' : 'Care Purse' },
        ]} />
    </Sheet>
  )
  if (step === 'amount' && to) return (
    <div className="ps-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="padscreen" role="dialog" aria-modal="true" aria-label={`Pay ${to.name}`}>
        <div className="ps-bar">
          <button type="button" className="ps-back" onClick={() => { setProblem(null); setStep('find') }} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <h2>{fund ? 'Pay from the fund' : 'Pay'}</h2><span />
        </div>
        <div className="ps-body">
          <span className="lbl">You pay</span>
          <Amount id="pay-amount" digits={typed} onDigits={d => { setProblem(null); setTyped(d) }} onEnter={toAmount} padElsewhere autoFocus={!phone} />
          <p className={`ps-note${problem ? ' bad' : ''}`}>{problem ?? (to.hospital && amount ? `${naira(to.fee ?? 0)} transfer fee` : `${naira(balance, true)} in ${from}`)}</p>
          <input id="pay-note" className="ps-for" maxLength={80} value={note} onChange={e => setNote(e.target.value)} placeholder="What it’s for (optional)" aria-label="What it’s for" />
        </div>
        <button type="button" className="way-bar" onClick={() => { setProblem(null); setStep('find') }}>
          <span className="bank-logo" aria-hidden="true">{initials(to.name)}</span>
          <span className="grow"><b>{to.name}</b><span>{to.hospital ? `Confirmed by Zome · ${to.bank}` : [to.category, to.address].filter(Boolean).join(' · ')}</span></span>
          <span className="change">Change</span>
        </button>
        {phone && <NumPad digits={typed} onDigits={d => { setProblem(null); setTyped(d) }} />}
        <div className="ps-cta"><button type="button" className="btn lg wide" disabled={!amount} onClick={toAmount}>{amount ? `Pay ${naira(amount, true)}` : 'Continue'}</button></div>
      </div>
    </div>
  )
  return (
    <Sheet eyebrow={fund ? 'Pay from the fund' : 'Pay a bill'} title="Find the provider" onClose={onClose}
      foot={fund ? undefined : <button type="button" className="btn soft span" onClick={() => setStep('bank')}>Outside the network: pay a bank account</button>}>
      <label className="search"><span className="lbl">Find</span>
        <input id="pay-find" value={q} onChange={e => { setProblem(null); setQ(e.target.value) }} placeholder="Clinic, pharmacy or lab" autoFocus autoComplete="off" /></label>
      <div className="pick">
        {!q.trim() ? <p className="none">Type the name of a clinic, pharmacy or lab.</p>
          : list === null ? <p className="none">Looking…</p>
          : list.length === 0 ? <p className="none">No one on Zome by that name yet.</p>
          : list.map(m => (
            <button key={m.id} type="button" onClick={() => { setTo(m); setStep('amount') }}>
              <span className="pin">{initials(m.name)}</span>
              <span className="grow"><b>{m.name}</b><span>{m.hospital ? 'Confirmed by Zome · ' : ''}{[m.category, m.address].filter(Boolean).join(' · ')}</span></span>
            </button>
          ))}
      </div>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}
