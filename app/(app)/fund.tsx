'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { TopUp } from '@/server/api'
import { BackIcon } from '../icons'
import { Sheet } from './sheet'

// Adding money by bank transfer (ADR-0024, ADR-0053 §3): an amount, then the
// one-time account Bachs opens for it. The money lands when the transfer
// arrives; the page shows it waiting until then. The amount is typed as on
// the dashboards; on a phone a keypad is there too.

const MAX_NAIRA = 5_000_000

export function FundSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [topUp, setTopUp] = useState<TopUp | null>(null)
  // One key per amount asked for, so a retry after a dropped connection
  // never opens a second transfer.
  const key = useRef<{ amount: string; key: string } | null>(null)

  const amount = Number(typed || '0')
  const set = (next: string) => {
    setProblem(null)
    const digits = next.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (Number(digits || '0') <= MAX_NAIRA) setTyped(digits)
  }
  const press = (d: string) => set(d === 'back' ? typed.slice(0, -1) : typed + d)

  const go = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (amount < 100) { setProblem('Add at least ₦100.'); return }
    if (!key.current || key.current.amount !== typed) key.current = { amount: typed, key: `web-${crypto.randomUUID()}` }
    setBusy(true); setProblem(null)
    try {
      const t = await call<TopUp>('vault/top-ups', 'POST', { amount_kobo: amount * 100 }, { 'Idempotency-Key': key.current.key })
      setTopUp(t)
      router.refresh()
    } catch (err) {
      setProblem(err instanceof Refused ? err.message : 'That didn’t go through. Try again.')
    } finally { setBusy(false) }
  }

  if (topUp) return (
    <Sheet title="Send a transfer" onClose={onClose} narrow
      lede={topUp.account_number ? `Send exactly ${naira(topUp.total_kobo)} from your bank app. This account takes one transfer, for 30 minutes.` : 'We’re setting up your transfer details. They’ll show on your purse in a moment.'}
      foot={<button type="button" className="btn span" onClick={onClose}>Done</button>}>
      {topUp.account_number && (
        <dl className="facts">
          <div><dt>Amount</dt><dd className="num">{naira(topUp.total_kobo)}{topUp.fee_kobo > 0 ? <span className="mut"> · includes {naira(topUp.fee_kobo)} fee</span> : null}</dd></div>
          <div><dt>Bank</dt><dd>{topUp.bank_name}</dd></div>
          <div><dt>Account number</dt><dd className="num">{topUp.account_number}
            <button type="button" className="copy" onClick={() => navigator.clipboard?.writeText(topUp.account_number ?? '')}>Copy</button></dd></div>
          <div><dt>Name</dt><dd>{topUp.account_name}</dd></div>
        </dl>
      )}
    </Sheet>
  )

  return (
    <form onSubmit={go}>
      <Sheet title="Add money" lede="By bank transfer, to your Care Purse. It’s for care only." onClose={onClose}
        foot={<>
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" disabled={busy || amount === 0} onClick={() => go()}>{busy ? 'Setting up…' : 'Continue'}</button>
        </>}>
        <label className="label" htmlFor="amount">Amount</label>
        <div className="amount-box">
          <span>₦</span>
          <input id="amount" inputMode="numeric" autoComplete="off" placeholder="0" value={amount ? amount.toLocaleString('en-NG') : ''}
            onChange={e => set(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); go() } }} />
        </div>
        <div className="quick">
          {[2000, 5000, 10000, 20000].map(n => <button key={n} type="button" onClick={() => set(String(n))}>{naira(n * 100, true)}</button>)}
        </div>
        <div className="pad phone-only">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map(d => <button key={d} type="button" onClick={() => press(d)}>{d}</button>)}
          <button type="button" aria-label="Delete" onClick={() => press('back')}><BackIcon /></button>
        </div>
        {problem && <p className="problem" role="alert">{problem}</p>}
      </Sheet>
    </form>
  )
}
