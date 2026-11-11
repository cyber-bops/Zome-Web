'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import { PinSheet } from './pin'
import { Sheet } from './sheet'

// Paying a bank account outside the network (ADR-0036): the bank, the
// account number (its name is looked up), the amount with Zome's fee shown
// before paying, the PIN. It goes out at once; if the bank sends it back,
// all of it returns to the purse.

type Bank = { code: string; name: string }
type Setup = { fee_kobo: number; minimum_kobo: number }
export type Transfer = { id: string; amount_kobo: number; fee_kobo: number; total_kobo: number; bank_name: string; last4: string; account_name: string; note: string; status: string; reason?: string; created_at: string }
const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t go through. Try again.'
const statusWord: Record<string, string> = { starting: 'On its way', sent: 'On its way', paid: 'Arrived', failed: 'Sent back' }

export function TransferFlow({ balance, onClose, onPaid, onBack }: { balance: number; onClose: () => void; onPaid: (t: string) => void; onBack: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'amount' | 'choose' | 'again' | 'pin' | 'done'>('account')
  const [banks, setBanks] = useState<Bank[] | null>(null)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [find, setFind] = useState('')
  const [bank, setBank] = useState<Bank | null>(null)
  const [number, setNumber] = useState('')
  const [name, setName] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)
  const [typed, setTyped] = useState('')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [first, setFirst] = useState('')
  const [done, setDone] = useState<Transfer | null>(null)
  const key = useRef<{ for: string; key: string } | null>(null)
  const amount = Number(typed || '0') * 100
  const fee = setup?.fee_kobo ?? 0

  useEffect(() => {
    Promise.all([call<Bank[]>('vault/transfer-banks'), call<Setup>('vault/transfers/setup')])
      .then(([b, s]) => { setBanks(b); setSetup(s) }, e => { setBanks([]); setProblem(words(e)) })
  }, [])

  // The account's name, once there are ten digits and a bank.
  useEffect(() => {
    setName(null)
    if (!bank || number.length !== 10) return
    let gone = false
    setLooking(true); setProblem(null)
    call<{ account_name: string }>('vault/transfer-lookup', 'POST', { bank_code: bank.code, account_number: number })
      .then(r => { if (!gone) setName(r.account_name) }, e => { if (!gone) setProblem(words(e)) })
      .finally(() => { if (!gone) setLooking(false) })
    return () => { gone = true }
  }, [bank, number])

  const shown = useMemo(() => {
    const q = find.trim().toLowerCase()
    return (banks ?? []).filter(b => !q || b.name.toLowerCase().includes(q)).slice(0, 40)
  }, [banks, find])

  const toPin = async () => {
    if (setup && amount < setup.minimum_kobo) { setProblem(`Send at least ${naira(setup.minimum_kobo)}.`); return }
    if (amount + fee > balance) { setProblem(`With the ${naira(fee)} fee that’s ${naira(amount + fee)}. Your Care Purse has ${naira(balance)}.`); return }
    setProblem(null)
    try {
      const st = await call<{ set: boolean; locked_until?: string }>('vault/pin')
      if (st.locked_until && Date.parse(st.locked_until) > Date.now()) { setProblem('Your PIN is locked for now after too many tries. Try again later.'); return }
      setStep(st.set ? 'pin' : 'choose')
    } catch (e) { setProblem(words(e)) }
  }

  const send = useCallback(async (pin: string): Promise<string | null> => {
    if (!bank) return 'Choose the bank.'
    const id = `${bank.code}:${number}:${amount}`
    if (!key.current || key.current.for !== id) key.current = { for: id, key: `web-${crypto.randomUUID()}` }
    try {
      const r = await call<{ transfer: Transfer }>('vault/transfers', 'POST', { bank_code: bank.code, account_number: number, amount_kobo: amount, pin, note: note.trim() }, { 'Idempotency-Key': key.current.key })
      setDone(r.transfer); setStep('done'); router.refresh()
      onPaid(`${naira(r.transfer.amount_kobo)} on its way to ${r.transfer.account_name}`)
      return null
    } catch (e) {
      if (e instanceof Refused && e.status >= 400 && e.status < 500 && !/pin/i.test(e.message)) { setProblem(e.message); setStep('amount'); return null }
      return words(e)
    }
  }, [bank, number, amount, note, router, onPaid])

  if (step === 'choose') return <PinSheet eyebrow="Payment PIN" title="Choose a PIN" lede={problem ?? 'Nothing leaves without your 4-digit PIN.'} onClose={onClose} onPin={async p => { setProblem(null); setFirst(p); setStep('again'); return null }} />
  if (step === 'again') return (
    <PinSheet eyebrow="Payment PIN" title="Enter it again" lede="To make sure it’s the one you meant." onClose={onClose} busyWord="Saving…"
      onPin={async p => {
        if (p !== first) { setStep('choose'); setProblem('Those PINs didn’t match. Choose one again.'); return 'Those PINs didn’t match.' }
        try { await call('vault/pin', 'POST', { pin: p }); return await send(p) } catch (e) { setStep('choose'); return words(e) }
      }} />
  )
  if (step === 'pin') return <PinSheet eyebrow={`${name} · ${naira(amount + fee)}`} title="Enter your PIN" busyWord="Sending…" onPin={send} onClose={onClose} />
  if (step === 'done' && done) return (
    <Sheet eyebrow={statusWord[done.status] ?? 'On its way'} title={`${naira(done.amount_kobo)} to ${done.account_name}`} onClose={onClose}
      foot={<button type="button" className="btn span" onClick={onClose}>Done</button>}>
      <dl className="kv">
        <div><dt>To</dt><dd>{done.account_name}</dd></div>
        <div><dt>Bank</dt><dd>{done.bank_name} ··{done.last4}</dd></div>
        {done.note && <div><dt>For</dt><dd>{done.note}</dd></div>}
        <div><dt>Zome’s fee</dt><dd>{naira(done.fee_kobo)}</dd></div>
        <div><dt>From your purse</dt><dd>{naira(done.total_kobo)}</dd></div>
      </dl>
      <p className="small">If the bank sends it back, all {naira(done.total_kobo)} returns to your Care Purse.</p>
    </Sheet>
  )
  if (step === 'amount' && bank && name) return (
    <Sheet eyebrow={`${bank.name} ··${number.slice(-4)}`} title={name} onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={() => { setProblem(null); setStep('account') }}>Back</button><button type="button" className="btn" disabled={!amount} onClick={toPin}>Confirm & Pay</button></>}>
      <label className="sr" htmlFor="tr-amount">Amount</label>
      <div className="amt"><span>₦</span>
        <input id="tr-amount" inputMode="numeric" autoComplete="off" placeholder="0" autoFocus value={typed ? Number(typed).toLocaleString('en-NG') : ''}
          onChange={e => { setProblem(null); const d = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''); if (Number(d || 0) <= 5_000_000) setTyped(d) }}
          onKeyDown={e => { if (e.key === 'Enter') toPin() }} />
      </div>
      <label className="label top-gap" htmlFor="tr-note">What it’s for (optional)</label>
      <input id="tr-note" className="field" maxLength={140} value={note} onChange={e => setNote(e.target.value)} placeholder="Hospital bill, scan…" />
      <dl className="kv top-gap">
        <div><dt>Zome’s fee</dt><dd>{naira(fee)}</dd></div>
        <div><dt>From your purse</dt><dd>{naira(amount + fee)}</dd></div>
      </dl>
      <p className="small">{naira(balance)} in your Care Purse.</p>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
  return (
    <Sheet eyebrow="Outside the network" title="Pay a bank account" onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onBack}>Back</button><button type="button" className="btn" disabled={!name} onClick={() => setStep('amount')}>Continue</button></>}>
      {!bank ? (
        <>
          <label className="search"><span className="lbl">Bank</span>
            <input id="tr-bank" value={find} onChange={e => setFind(e.target.value)} placeholder="Find the bank" autoFocus autoComplete="off" /></label>
          <div className="pick">
            {banks === null ? <p className="none">Loading banks…</p>
              : shown.length === 0 ? (banks.length ? <p className="none">No bank by that name.</p> : null)
              : shown.map(b => <button key={b.code} type="button" onClick={() => setBank(b)}><span className="pin">{b.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span><span className="grow"><b>{b.name}</b></span></button>)}
          </div>
        </>
      ) : (
        <>
          <p className="chosen"><span>{bank.name}</span><button type="button" className="link-btn" onClick={() => { setBank(null); setName(null) }}>Change</button></p>
          <label className="label top-gap" htmlFor="tr-number">Account number</label>
          <input id="tr-number" className="field mono" inputMode="numeric" autoComplete="off" maxLength={10} autoFocus value={number}
            onChange={e => { setProblem(null); setNumber(e.target.value.replace(/\D/g, '').slice(0, 10)) }} placeholder="0123456789" />
          <p className="small" role="status">{looking ? 'Finding the account…' : name ? <b className="found">{name}</b> : number.length === 10 ? '' : 'Ten digits.'}</p>
        </>
      )}
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

export { statusWord }
