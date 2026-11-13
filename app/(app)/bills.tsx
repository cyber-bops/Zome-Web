'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import { PinSheet } from './pin'
import { Sheet } from './sheet'

// A bill a provider sent to the person's pay code (ADR-0029): approve it with
// the PIN, or decline it. It waits until then, or until it runs out.

export type Bill = { id: string; receipt: string; merchant: string; category: string; amount_kobo: number; note: string; status: string; created_at: string; expires_at: string }
const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t work this time. Please try again.'

export function BillCard({ bill, onOpen }: { bill: Bill; onOpen: () => void }) {
  return (
    <button type="button" className="bill-card" onClick={onOpen}>
      <span className="lbl">Bill · waiting for you</span>
      <b>{naira(bill.amount_kobo)} to {bill.merchant}</b>
      {bill.note && <span className="d">{bill.note}</span>}
      <span className="go-word">Review</span>
    </button>
  )
}

export function BillSheet({ bill, onClose, onDone }: { bill: Bill; onClose: () => void; onDone: (t: string) => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'look' | 'pin'>('look')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const approve = useCallback(async (pin: string) => {
    try {
      const r = await call<{ cashback_kobo: number }>(`vault/bills/${bill.id}/approve`, 'POST', { pin })
      router.refresh(); onClose()
      onDone(r.cashback_kobo > 0 ? `Paid · ${naira(r.cashback_kobo)} cashback added` : `Paid ${naira(bill.amount_kobo)} to ${bill.merchant}`)
      return null
    } catch (e) { return words(e) }
  }, [bill, router, onClose, onDone])

  const decline = async () => {
    setBusy(true)
    try { await call(`vault/bills/${bill.id}/decline`, 'POST', {}); router.refresh(); onClose(); onDone('Bill declined') }
    catch (e) { setProblem(words(e)); setBusy(false) }
  }

  if (step === 'pin') return <PinSheet eyebrow={`${bill.merchant} · ${naira(bill.amount_kobo)}`} title="Enter your PIN" busyWord="Paying…" onPin={approve} onClose={onClose} />
  const until = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(bill.expires_at))
  return (
    <Sheet eyebrow={`Receipt ${bill.receipt}`} title="Confirm payment" onClose={onClose}
      foot={<><button type="button" className="btn soft" disabled={busy} onClick={decline}>Decline</button><button type="button" className="btn" disabled={busy} onClick={() => setStep('pin')}>Pay {naira(bill.amount_kobo)}</button></>}>
      <div className="big-amt"><span className="lbl">To {bill.merchant}</span><b>{naira(bill.amount_kobo)}</b></div>
      <dl className="kv">
        {bill.note && <div><dt>For</dt><dd>{bill.note}</dd></div>}
        <div><dt>From</dt><dd>Care Purse</dd></div>
        <div><dt>Waits until</dt><dd>{until}</dd></div>
      </dl>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}
