'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import { PinSheet } from './pin'
import { Sheet } from './sheet'

// Paying a business on Zome from the Care Purse (ADR-0036): find the
// provider, the amount, the PIN; then the receipt, stamped. A person with no
// PIN yet chooses one first, as the app has them do.

export type Merchant = { id: string; name: string; category: string; address: string }
type Paid = { bill: { receipt: string; merchant: string; amount_kobo: number; created_at: string }; cashback_kobo: number }
const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t go through. Try again.'
const initials = (n: string) => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export function PaySheet({ balance, onClose, onPaid }: { balance: number; onClose: () => void; onPaid: (t: string) => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'find' | 'amount' | 'choose' | 'again' | 'pin' | 'paid'>('find')
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

  // The network's businesses, as the person types.
  useEffect(() => {
    if (step !== 'find') return
    if (!q.trim()) { setList([]); return }
    const t = setTimeout(() => {
      setList(null)
      call<{ merchants: Merchant[] }>(`vault/merchants?q=${encodeURIComponent(q.trim())}`)
        .then(r => setList(r.merchants), e => { setList([]); setProblem(words(e)) })
    }, 250)
    return () => clearTimeout(t)
  }, [q, step])

  const toAmount = async () => {
    if (amount < 10000) { setProblem('Pay at least ₦100.'); return }
    if (amount > balance) { setProblem(`Your Care Purse has ${naira(balance)}. Fund it first.`); return }
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
      const r = await call<Paid>(`vault/merchants/${to.id}/pay`, 'POST', { amount_kobo: amount, pin, note: note.trim() }, { 'Idempotency-Key': key.current.key })
      setPaid(r); setStep('paid'); router.refresh()
      onPaid(`Paid ${naira(r.bill.amount_kobo)} to ${r.bill.merchant}`)
      return null
    } catch (e) {
      if (e instanceof Refused && e.status >= 400 && e.status < 500 && !/pin/i.test(e.message)) { setProblem(e.message); setStep('amount'); return null }
      return words(e)
    }
  }, [to, amount, note, router, onPaid])

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
    <Sheet eyebrow={`Receipt ${paid.bill.receipt}`} title={`${naira(paid.bill.amount_kobo)} to ${paid.bill.merchant}`} onClose={onClose}
      foot={<button type="button" className="btn span" onClick={onClose}>Done</button>}>
      <div className="paid-slip">
        <span className="stamp big">PAID</span>
        <dl className="kv">
          <div><dt>To</dt><dd>{paid.bill.merchant}</dd></div>
          <div><dt>From</dt><dd>Care Purse</dd></div>
          {note.trim() && <div><dt>For</dt><dd>{note.trim()}</dd></div>}
          {paid.cashback_kobo > 0 && <div><dt>Cashback</dt><dd className="in">+{naira(paid.cashback_kobo)}</dd></div>}
        </dl>
      </div>
    </Sheet>
  )
  if (step === 'amount' && to) return (
    <Sheet eyebrow="Pay a bill" title={to.name} lede={to.address || to.category} onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={() => { setProblem(null); setStep('find') }}>Back</button><button type="button" className="btn" disabled={!amount} onClick={toAmount}>Confirm & Pay</button></>}>
      <label className="sr" htmlFor="pay-amount">Amount</label>
      <div className="amt"><span>₦</span>
        <input id="pay-amount" inputMode="numeric" autoComplete="off" placeholder="0" autoFocus value={typed ? Number(typed).toLocaleString('en-NG') : ''}
          onChange={e => { setProblem(null); const d = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''); if (Number(d || 0) <= 5_000_000) setTyped(d) }}
          onKeyDown={e => { if (e.key === 'Enter') toAmount() }} />
      </div>
      <label className="label top-gap" htmlFor="pay-note">What it’s for (optional)</label>
      <input id="pay-note" className="field" maxLength={80} value={note} onChange={e => setNote(e.target.value)} placeholder="Consultation, prescription…" />
      <p className="small">{naira(balance)} in your Care Purse.</p>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
  return (
    <Sheet eyebrow="Pay a bill" title="Find the provider" onClose={onClose}>
      <label className="search"><span className="lbl">Find</span>
        <input id="pay-find" value={q} onChange={e => { setProblem(null); setQ(e.target.value) }} placeholder="Clinic, pharmacy or lab" autoFocus autoComplete="off" /></label>
      <div className="pick">
        {!q.trim() ? <p className="none">Type the name of a clinic, pharmacy or lab.</p>
          : list === null ? <p className="none">Looking…</p>
          : list.length === 0 ? <p className="none">No one on Zome by that name yet.</p>
          : list.map(m => (
            <button key={m.id} type="button" onClick={() => { setTo(m); setStep('amount') }}>
              <span className="pin">{initials(m.name)}</span>
              <span className="grow"><b>{m.name}</b><span>{[m.category, m.address].filter(Boolean).join(' · ')}</span></span>
            </button>
          ))}
      </div>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}
