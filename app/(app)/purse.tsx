'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import { monthTotals } from '@/lib/purse'
import { stepWhy, stepWord } from '@/lib/words'
import type { Checklist, Purse } from '@/server/api'
import { ArrowIcon, CodeIcon, PayIcon, PlusIcon, ScissorsIcon } from '../icons'
import { BillCard, BillSheet, type Bill } from './bills'
import { onTheWeb, SetupSheet } from './setup'
import { FundSheet } from './fund'
import { PaySheet } from './pay'
import { Tape, type Filter } from './tape'

// The purse, printed: the total, three keys (A, P, C on a keyboard), the
// pay-code ticket, the checklist's next step as a stub, and the tape.

const zone = 'Africa/Lagos'
type Code = { code: string; expires_at: string }

function Ticket({ code, onNew, busy }: { code: Code | null; onNew: () => void; busy: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { if (!code) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [code])
  const left = code ? Math.max(0, Math.round((Date.parse(code.expires_at) - now) / 1000)) : 0
  const live = !!code && left > 0
  return (
    <button type="button" className={`ticket${code && !live ? ' off' : ''}`} onClick={onNew} disabled={busy} aria-label={live ? `Pay code ${code?.code}` : 'Show a pay code'}>
      <span className="tl">PAY CODE · AT THE COUNTER</span>
      <span className="code">{code ? `${code.code.slice(0, 3)} ${code.code.slice(3)}` : busy ? '· · ·' : '— — —'}</span>
      <span className="exp">{live ? <>EXPIRES IN<b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b></> : code ? <>EXPIRED<b>NEW</b></> : <>TAP TO<b>SHOW</b></>}</span>
    </button>
  )
}

export function PurseView({ purse, name, first, openFund, checklist }: { purse: Purse; name: string; first: string; openFund: boolean; checklist: Checklist | null }) {
  const [sheet, setSheet] = useState<null | 'fund' | 'pay' | 'step'>(openFund ? 'fund' : null)
  const [stepId, setStepId] = useState('bvn')
  const [filter, setFilter] = useState<Filter>('all')
  const [code, setCode] = useState<Code | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [bill, setBill] = useState<Bill | null>(null)

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
    if (fresh && live) { setCode(null); if (!sheet) setBill(fresh) }
  }, [bills, live, sheet])
  useEffect(() => { if (openFund) setSheet('fund') }, [openFund])
  const close = useCallback(() => { setSheet(null); if (location.search.includes('fund')) history.replaceState(null, '', '/') }, [])
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const newCode = useCallback(async () => {
    setBusy(true)
    try {
      const c = await call<Code>('vault/pay-codes', 'POST', {})
      setCode(c); say('Show this code at the counter')
    } catch (e) {
      say(e instanceof Refused ? e.message : 'Couldn’t make a code. Try again.')
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
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: zone }).format(new Date())
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone }).format(new Date())

  return (
    <div className="view">
      <div>
        <p className="eyebrow lbl"><span><b>Care Purse</b></span><span>{today}</span>{checklist && <span>{checklist.done} of {checklist.total} set up</span>}</p>
        <p className="total" aria-label={`Balance ${naira(purse.balance_kobo)}`}><span className="cur">₦</span>{whole}<span className="k">.{kobo}</span></p>
        <p className="facts">
          {rate && <span>Earning <b>{rate}% a year</b></span>}
          <span>{month.interest > 0 ? `+${naira(month.interest)} interest this month` : 'No interest yet this month'}</span>
        </p>
        {waiting && <p className="waiting">Waiting for {naira(waiting.total_kobo)} by transfer</p>}
        {bills.map(b => <BillCard key={b.id} bill={b} onOpen={() => setBill(b)} />)}
        <div className="keys">
          <button type="button" className={`key pri${pressed === 'a' ? ' pressed' : ''}`} onClick={() => setSheet('fund')}><span className="ic"><PlusIcon /></span><span>Add<span className="long"> money</span></span><kbd>A</kbd></button>
          <button type="button" className={`key${pressed === 'p' ? ' pressed' : ''}`} onClick={() => setSheet('pay')}><span className="ic"><PayIcon /></span><span>Pay<span className="long"> for care</span></span><kbd>P</kbd></button>
          <button type="button" className={`key${pressed === 'c' ? ' pressed' : ''}`} onClick={newCode} disabled={busy}><span className="ic"><CodeIcon /></span><span><span className="long">Pay code</span><span className="short">Code</span></span><kbd>C</kbd></button>
        </div>
        <div className="mcards" aria-label={`This month, ${monthName}`}>
          <div className="mcard"><span>Money in · {monthName}</span><b className="in">{naira(month.in)}</b></div>
          <div className="mcard"><span>Paid for care</span><b>{naira(month.out)}</b></div>
          <div className="mcard"><span>Interest earned</span><b>{naira(month.interest)}</b>{rate && <small>At {rate}% a year</small>}</div>
        </div>
        <div className="row2">
          <Ticket code={code} onNew={newCode} busy={busy} />
          {next && onTheWeb.has(next.id) && (
            <button type="button" className="stub" onClick={() => { setStepId(next.id); setSheet('step') }}>
              <span className="sc"><ScissorsIcon /></span>
              <span className="lbl">Next · {checklist?.done} of {checklist?.total} done</span>
              <b>{stepWord[next.id]}</b>
              <p className="d">{stepWhy[next.id]}</p>
              <span className="go"><ArrowIcon /></span>
            </button>
          )}
          {next && !onTheWeb.has(next.id) && (
            <Link href="/profile" className="stub">
              <span className="sc"><ScissorsIcon /></span>
              <span className="lbl">Next · {checklist?.done} of {checklist?.total} done</span>
              <b>{stepWord[next.id] ?? next.id}</b>
              <p className="d">{stepWhy[next.id] ?? ''}</p>
              <span className="go"><ArrowIcon /></span>
            </Link>
          )}
        </div>
      </div>
      <div className="tape-wrap">
        <div className="tape-tools"><span className="lbl">Receipts</span>
          <div className="chips" role="group" aria-label="Show">
            {(['all', 'in', 'out'] as Filter[]).map(f => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'in' ? 'In' : 'Out'}</button>)}
          </div></div>
        <Tape movements={purse.movements} balance={purse.balance_kobo} name={name} filter={filter} />
      </div>

      {sheet === 'fund' && <FundSheet onClose={close} onVerify={() => { setStepId('bvn'); setSheet('step') }} linked={purse.linked_account} onDone={say} />}
      {sheet === 'step' && <SetupSheet step={stepId} onClose={close} onDone={say} />}
      {sheet === 'pay' && <PaySheet balance={purse.balance_kobo} onClose={close} onPaid={say} />}
      {bill && !sheet && <BillSheet bill={bill} onClose={() => { setBill(null); lookForBills() }} onDone={t => { setBills(bs => bs.filter(b => b.id !== bill.id)); say(t) }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
