'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { TopUp } from '@/server/api'
import { Sheet } from './sheet'

// Adding money by bank transfer (ADR-0024, ADR-0053 §3): an amount, then the
// one-time account Bachs opens for it. The money lands when the transfer
// arrives; the purse shows it waiting until then.

const MAX_NAIRA = 5_000_000
const QUICK = [2000, 5000, 10000, 20000]
const lagosTime = (iso: string) => new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(iso))

export function FundSheet({ onClose, onVerify }: { onClose: () => void; onVerify?: () => void }) {
  const router = useRouter()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [verify, setVerify] = useState(false)
  const [topUp, setTopUp] = useState<TopUp | null>(null)
  const [copied, setCopied] = useState(false)
  // One key per amount, so a retry after a dropped connection never opens a second transfer.
  const key = useRef<{ amount: string; key: string } | null>(null)

  const amount = Number(typed || '0')
  const set = (next: string) => {
    setProblem(null)
    const digits = next.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (Number(digits || '0') <= MAX_NAIRA) setTyped(digits)
  }

  const go = async () => {
    if (amount < 100) { setProblem('Add at least ₦100.'); return }
    if (!key.current || key.current.amount !== typed) key.current = { amount: typed, key: `web-${crypto.randomUUID()}` }
    setBusy(true); setProblem(null)
    try {
      const t = await call<TopUp>('vault/top-ups', 'POST', { amount_kobo: amount * 100 }, { 'Idempotency-Key': key.current.key })
      setTopUp(t)
      router.refresh()
    } catch (err) {
      setProblem(err instanceof Refused ? err.message : 'That didn’t go through. Try again.')
      setVerify(err instanceof Refused && err.type === 'VerifyFirst')
    } finally { setBusy(false) }
  }

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

  return (
    <Sheet eyebrow="Care Purse" title="Add money" onClose={onClose}
      foot={<>
        <button type="button" className="btn soft" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={busy || amount === 0} onClick={go}>{busy ? 'Setting up…' : 'Continue'}</button>
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
      <p className="small">By bank transfer, from any bank app.</p>
      {problem && <p className="err" role="alert">{problem}</p>}
      {verify && onVerify && <button type="button" className="btn soft top-gap wide" onClick={onVerify}>Add your BVN</button>}
    </Sheet>
  )
}
