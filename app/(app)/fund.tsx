'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { TopUp } from '@/server/api'
import { BackIcon } from '../icons'
import { Sheet } from './sheet'

// Adding money by bank transfer (ADR-0024, ADR-0053 §3): an amount on the
// keypad, then the one-time account Bachs opens for it. The money lands when
// the transfer arrives; the page shows it waiting until then.

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

  const naira0 = Number(typed || '0')
  const press = (d: string) => {
    setProblem(null)
    setTyped(t => {
      if (d === 'back') return t.slice(0, -1)
      const next = (t === '0' ? '' : t) + d
      return Number(next) > MAX_NAIRA ? t : next
    })
  }

  const go = async () => {
    if (naira0 < 100) { setProblem('Add at least ₦100.'); return }
    if (!key.current || key.current.amount !== typed) key.current = { amount: typed, key: `web-${crypto.randomUUID()}` }
    setBusy(true); setProblem(null)
    try {
      const t = await call<TopUp>('vault/top-ups', 'POST', { amount_kobo: naira0 * 100 }, { 'Idempotency-Key': key.current.key })
      setTopUp(t)
      router.refresh()
    } catch (e) {
      setProblem(e instanceof Refused ? e.message : 'That didn’t go through. Try again.')
    } finally { setBusy(false) }
  }

  if (topUp) return (
    <Sheet title="Send a transfer" onClose={onClose}>
      {topUp.account_number ? (
        <>
          <div className="kv2">
            <div className="r"><span>Amount</span><b className="num">{naira(topUp.total_kobo)}</b></div>
            <div className="r"><span>Bank</span><b>{topUp.bank_name}</b></div>
            <div className="r"><span>Account number</span><b className="num">{topUp.account_number}
              <button type="button" className="copy" onClick={() => navigator.clipboard?.writeText(topUp.account_number ?? '')}>Copy</button></b></div>
            <div className="r"><span>Name</span><b>{topUp.account_name}</b></div>
          </div>
          <p className="big-note">Send exactly {naira(topUp.total_kobo)} from your bank app{topUp.fee_kobo > 0 ? `, which includes a ${naira(topUp.fee_kobo)} fee` : ''}. This account works for one transfer, for 30 minutes. Your purse shows the money as soon as it arrives.</p>
        </>
      ) : <p className="big-note">We’re setting up your transfer details. They’ll show on your purse in a moment.</p>}
      <button type="button" className="btn lg wide white" onClick={onClose}>Done</button>
    </Sheet>
  )

  return (
    <Sheet title="Add money" onClose={onClose}>
      <div className="amt-card">
        <div className="top"><span>You add</span><span>By bank transfer</span></div>
        <div className="row2"><span className={`n num${typed ? '' : ' zero'}`}>{Number(typed || '0').toLocaleString('en-NG')}</span><span className="cur">NGN</span></div>
        <p className="sub">To your Care Purse, for care only.</p>
      </div>
      <div className="quick">
        {[2000, 5000, 10000, 20000].map(n => <button key={n} type="button" onClick={() => { setProblem(null); setTyped(String(n)) }}>{naira(n * 100, true)}</button>)}
      </div>
      <div className="pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map(d => <button key={d} type="button" onClick={() => press(d)}>{d}</button>)}
        <button type="button" aria-label="Delete" onClick={() => press('back')}><BackIcon /></button>
      </div>
      {problem && <p className="problem" role="alert">{problem}</p>}
      <button type="button" className="btn lg wide white" disabled={busy || naira0 === 0} onClick={go}>{busy ? 'Setting up…' : 'Continue'}</button>
    </Sheet>
  )
}
