'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import { monthTotals, spentThisMonth } from '@/lib/purse'
import { stepWord } from '@/lib/words'
import type { Checklist, MyCareFund, Purse } from '@/server/api'
import { ChevronIcon, EyeIcon, HeartIcon, PayIcon, PlusIcon, QrIcon, ReceiptIcon } from '../icons'
import { BillCard, BillSheet, type Bill } from './bills'
import { onTheWeb, SetupSheet } from './setup'
import { FundSheet } from './fund'
import { PaySheet } from './pay'
import { Tape, type Filter } from './tape'
import { HangingTicket } from './ticket'
import { Sheet } from './sheet'

// The purse, in soft tiles: a greeting and the balance, three keys (A, P, C
// on a keyboard), the month's spending, family gifts and the pay-code ticket,
// the next set-up step, the Care Fund, and the receipts as a strip of paper.

const zone = 'Africa/Lagos'
type Code = { code: string; expires_at: string }

function Ticket({ code, onNew, busy }: { code: Code | null; onNew: () => void; busy: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { if (!code) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [code])
  const left = code ? Math.max(0, Math.round((Date.parse(code.expires_at) - now) / 1000)) : 0
  const live = !!code && left > 0
  return (
    <button type="button" className={`tile ticket-tile${code && !live ? ' off' : ''}`} onClick={onNew} disabled={busy} aria-label={live ? `Pay code ${code?.code}` : 'Show a pay code'}>
      <span className="ic"><QrIcon /></span>
      <span className="perf" aria-hidden="true" />
      <span className="t">Pay code</span>
      <span className="code">{code ? `${code.code.slice(0, 3)} ${code.code.slice(3)}` : busy ? '· · ·' : '— — —'}</span>
      {live && (
        <svg className={`life${left < 60 ? ' late' : ''}`} viewBox="0 0 300 4" preserveAspectRatio="none" role="img" aria-label={`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`}>
          <rect className="track" width="300" height="4" rx="2" /><rect className="left" width={Math.max(0, Math.min(300, left))} height="4" rx="2" />
        </svg>
      )}
    </button>
  )
}

/** The pay code as a ticket: printed in, its five minutes as a line, a live countdown. */
function CodeSheet({ code, holder, onClose }: { code: Code; holder: string; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const total = 300
  const left = Math.max(0, Math.round((Date.parse(code.expires_at) - now) / 1000))
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return (
    <Sheet eyebrow="Pay code" title="Show this at the counter" onClose={onClose}
      foot={<button type="button" className="btn span" onClick={onClose}>Done</button>}>
      <HangingTicket eyebrow="PAY CODE" headline={`${code.code.slice(0, 3)} ${code.code.slice(3)}`} print
        fields={[['Holder', holder], ['Valid', '5 min']]} reference={new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date())}
        extra={
          <svg className={`life${left < 60 ? ' late' : ''}`} viewBox={`0 0 ${total} 4`} preserveAspectRatio="none" aria-hidden="true">
            <rect className="track" width={total} height="4" rx="2" /><rect className="left" width={Math.min(total, left)} height="4" rx="2" />
          </svg>
        }
        below={<p className="clock-chip" role="timer" aria-live="off">{left > 0 ? clock : 'Expired'}</p>} />
    </Sheet>
  )
}

/** The month's running spend, drawn into a 150 × 56 box. */
function Spark({ line }: { line: number[] }) {
  const top = Math.max(1, ...line)
  const pts = (line.length > 1 ? line : [0, ...line]).map((v, i, all) => [2 + (i * 146) / Math.max(1, all.length - 1), 50 - (v / top) * 40])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [ex] = pts[pts.length - 1]
  return (
    <svg className="spark" viewBox="0 0 150 56" preserveAspectRatio="none" aria-hidden="true">
      <path className="area" d={`${d} L${ex.toFixed(1)} 56 L2 56 Z`} />
      <path className="line" pathLength={1} d={d} />
    </svg>
  )
}

export function PurseView({ purse, name, first, openFund, checklist, fund }: { purse: Purse; name: string; first: string; openFund: boolean; checklist: Checklist | null; fund?: MyCareFund | null }) {
  const [sheet, setSheet] = useState<null | 'fund' | 'pay' | 'step'>(openFund ? 'fund' : null)
  const [stepId, setStepId] = useState('bvn')
  const [filter] = useState<Filter>('all')
  const [code, setCode] = useState<Code | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [bill, setBill] = useState<Bill | null>(null)
  const [hidden, setHidden] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)

  // Bills sent to the pay code: looked for on arrival, and every few seconds
  // while a code is live, so a bill shows the moment the counter sends it.
  const lookForBills = useCallback(() => {
    call<{ bills: Bill[] }>('vault/bills').then(r => {
      setBills(r.bills)
    }, () => {})
  }, [])
  useEffect(() => { lookForBills() }, [lookForBills])
  const live = !!code && Date.parse(code.expires_at) > Date.now()
  useEffect(() => {
    if (!live) return
    const t = setInterval(lookForBills, 4000)
    return () => clearInterval(t)
  }, [live, lookForBills])
  const seen = useRef<Set<string>>(new Set())
  useEffect(() => {
    // A bill that arrives while the code is showing opens by itself.
    const fresh = bills.find(b => !seen.current.has(b.id))
    bills.forEach(b => seen.current.add(b.id))
    // A code takes one bill (ADR-0029): once one comes, the ticket is spent.
    if (fresh && live) { setCode(null); setCodeOpen(false); if (!sheet) setBill(fresh) }
  }, [bills, live, sheet])
  useEffect(() => { if (openFund) setSheet('fund') }, [openFund])
  const close = useCallback(() => { setSheet(null); if (location.search.includes('fund')) history.replaceState(null, '', '/') }, [])
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const newCode = useCallback(async () => {
    setBusy(true)
    try {
      const c = await call<Code>('vault/pay-codes', 'POST', {})
      setCode(c); setCodeOpen(true)
    } catch (e) {
      say(e instanceof Refused ? e.message : 'We couldn’t make a code just now. Please try again.')
    } finally { setBusy(false) }
  }, [])

  // A, P and C, as on the keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || bill || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return
      const k = e.key.toLowerCase()
      if (k === 'a') { setPressed('a'); setSheet('fund') } else if (k === 'p') { setPressed('p'); setSheet('pay') } else if (k === 'c') { setPressed('c'); newCode() } else return
      setTimeout(() => setPressed(null), 140)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheet, bill, newCode])

  const [whole, kobo] = (purse.balance_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.')
  const month = monthTotals(purse.movements)
  const rate = purse.interest_rate_bps > 0 ? (purse.interest_rate_bps / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 }) : null
  const next = checklist?.steps.find(s => s.state === 'to_do')
  const waiting = purse.top_ups.find(t => t.state === 'awaiting_payment' && Date.parse(t.expires_at) > Date.now())
  const spent = spentThisMonth(purse.movements)
  const gifts = purse.movements.filter(m => m.kind === 'gift')
  const given = gifts.reduce((t, m) => t + m.amount_kobo, 0)
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: zone }).format(new Date()))
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const f = fund?.fund
  const nextStep = next && (
    <>
      <svg className="ring" width="58" height="58" viewBox="0 0 46 46" aria-hidden="true">
        <circle cx="23" cy="23" r="19" className="track" />
        <circle cx="23" cy="23" r="19" className="done" strokeDasharray={`${(119.4 * (checklist?.done ?? 0)) / (checklist?.total || 1)} 119.4`} transform="rotate(-90 23 23)" />
        <text x="23" y="27" textAnchor="middle">{checklist?.done}/{checklist?.total}</text>
      </svg>
      <span className="grow"><span className="lbl">Next step</span><b>{stepWord[next.id] ?? next.id}</b></span>
      <span className="go" aria-hidden="true"><ChevronIcon /></span>
    </>
  )

  return (
    <div className="view home">
      <div className="home-main">
        <p className="hello-title">{hello}{first ? <>, <span>{first}</span></> : null}</p>
        <div className="bal">
          <div className="bal-top">
            <span className="lbl">Care Purse</span>
            <button type="button" className="eye" onClick={() => setHidden(h => !h)} aria-label={hidden ? 'Show balance' : 'Hide balance'} aria-pressed={hidden}><EyeIcon /></button>
          </div>
          <p className={`big${hidden ? ' hidden-amt' : ''}`} aria-label={hidden ? 'Balance hidden' : `Balance ${naira(purse.balance_kobo)}`}><span className="cur">₦</span><span className="n">{whole}</span><span className="k">.{kobo}</span></p>
          <p className="under">{rate && <span className="chip">↑ {rate}% a year</span>}{month.interest > 0 && <span>+{naira(month.interest)} this month</span>}</p>
        </div>
        {waiting && <p className="waiting">Waiting for {naira(waiting.total_kobo)} by transfer</p>}
        {bills.map(b => <BillCard key={b.id} bill={b} onOpen={() => setBill(b)} />)}
        <div className="acts">
          <button type="button" className={`pill dark${pressed === 'a' ? ' pressed' : ''}`} onClick={() => setSheet('fund')}><PlusIcon />Add</button>
          <button type="button" className={`pill soft${pressed === 'p' ? ' pressed' : ''}`} onClick={() => setSheet('pay')}><PayIcon />Pay</button>
          <button type="button" className={`pill soft${pressed === 'c' ? ' pressed' : ''}`} onClick={newCode} disabled={busy}><QrIcon />Code</button>
        </div>

        <div className="tiles">
          <Link href="/receipts" className="tile wide">
            <span className="txt">
              <span className="ic b"><ReceiptIcon /></span>
              <span className="t">Spent</span>
              <span className="num">{naira(month.out, true)}</span>
            </span>
            <Spark line={spent} />
          </Link>
          <Link href="/care-fund?mode=family" className="tile">
            <span className="ic a"><HeartIcon /></span>
            <span className="t">From family</span>
            <span className="num">{naira(given, true)}</span>
          </Link>
          <Ticket code={code} onNew={() => (code && Date.parse(code.expires_at) > Date.now() ? setCodeOpen(true) : newCode())} busy={busy} />
        </div>

        {next && (onTheWeb.has(next.id)
          ? <button type="button" className="feature" onClick={() => { setStepId(next.id); setSheet('step') }}>{nextStep}</button>
          : <Link href="/profile" className="feature">{nextStep}</Link>)}
        {f && (
          <Link href="/care-fund?mode=public" className="envelope fund-card">
            <span className="lbl">Care Fund</span>
            <b className="fund-t">{f.title}</b>
            <span className="meter"><i className={`w${Math.round(Math.min(100, (f.raised_kobo / Math.max(1, f.goal_kobo)) * 100) / 5) * 5}`} /></span>
            <span className="nums"><span><b>{naira(f.raised_kobo, true)}</b> of {naira(f.goal_kobo, true)}</span></span>
          </Link>
        )}
      </div>
      <div className="tape-wrap">
        <p className="sec-h">Latest <Link href="/receipts">See all</Link></p>
        <Tape movements={purse.movements} balance={purse.balance_kobo} name={name} filter={filter} latest={5} />
      </div>

      {sheet === 'fund' && <FundSheet onClose={close} onVerify={() => { setStepId('bvn'); setSheet('step') }} onLink={() => { setStepId('bank_account'); setSheet('step') }} linked={purse.linked_account} onDone={say} />}
      {sheet === 'step' && <SetupSheet step={stepId} onClose={close} onDone={say} />}
      {sheet === 'pay' && <PaySheet balance={purse.balance_kobo} onClose={close} onPaid={say} />}
      {bill && !sheet && <BillSheet bill={bill} onClose={() => { setBill(null); lookForBills() }} onDone={t => { setBills(bs => bs.filter(b => b.id !== bill.id)); say(t) }} />}
      {codeOpen && code && !bill && <CodeSheet code={code} holder={first || name.split(/\s+/)[0] || 'You'} onClose={() => setCodeOpen(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
