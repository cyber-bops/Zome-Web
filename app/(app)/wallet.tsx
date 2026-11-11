'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Checklist, Movement, Purse, TopUp } from '@/server/api'
import { naira } from '@/lib/money'
import { ArrowIcon, CheckIcon, ChevIcon, ClockIcon, CodeIcon, GiftIcon, InIcon, OutIcon, PlusIcon, SparkIcon } from '../icons'
import { ZomeMark } from '../mark'
import { FundSheet } from './fund'
import { Sheet } from './sheet'
import { balanceLine, monthTotals } from '@/lib/purse'

// Home: the Care Purse. On a phone, the wallet look (owner's references,
// 11 November 2026); on a wide screen, the bento grid the owner chose ("B").

const zone = 'Africa/Lagos'
const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date(iso))
function dayName(iso: string): string {
  const k = dayKey(iso), now = Date.now()
  if (k === dayKey(new Date(now).toISOString())) return 'Today'
  if (k === dayKey(new Date(now - 864e5).toISOString())) return 'Yesterday'
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', timeZone: zone }).format(new Date(iso))
}
const time = (iso: string) => new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date(iso))

function groups<T>(items: T[], at: (t: T) => string): [string, T[]][] {
  const out: [string, T[]][] = []
  for (const it of items) {
    const name = dayName(at(it))
    const last = out[out.length - 1]
    if (last && last[0] === name) last[1].push(it); else out.push([name, [it]])
  }
  return out
}

// The iOS app's words (CarePurseView, ProfileChecklistView).
const named: Record<string, string> = { top_up: 'Added', reversal: 'Bank reversal', interest: 'Interest', cashback: 'Cashback', payment: 'Paid a bill' }
const title = (m: Movement) => m.kind === 'team' ? (m.from ? `From ${m.from}` : 'From your employer') : named[m.kind] ?? (m.amount_kobo >= 0 ? 'Received' : 'Paid')
const icon = (m: Movement) => m.kind === 'team' ? ['y', <GiftIcon key="i" />] as const
  : m.kind === 'interest' || m.kind === 'cashback' ? ['g', <SparkIcon key="i" />] as const
  : m.amount_kobo < 0 ? ['', <OutIcon key="i" />] as const : ['', <InIcon key="i" />] as const
const topUpWord: Record<string, string> = { opening: 'Setting up', awaiting_payment: 'Waiting', part_paid: 'Part paid', paid: 'Added', failed: 'Didn’t go through', reversed: 'Reversed', expired: 'Expired' }
const stepWord: Record<string, string> = { bvn: 'Add your BVN', nin: 'Add your NIN', selfie: 'Take a selfie', personal_info: 'Personal information', phone: 'Phone number', next_of_kin: 'Next of kin', bank_account: 'Link a bank account' }

type Filter = 'all' | 'in' | 'out' | 'top-ups'
type SheetName = null | 'fund' | 'purses' | 'pay' | 'code'

function Activity({ purse, filter }: { purse: Purse; filter: Filter }) {
  if (filter === 'top-ups') return purse.top_ups.length === 0
    ? <p className="none">No top-ups yet. Tap Fund to add money.</p>
    : <>{groups(purse.top_ups, t => t.created_at).map(([day, list]) => (
      <section key={day}>
        <h3 className="day">{day}</h3>
        <ul className="rows">
          {list.map((t: TopUp) => (
            <li key={t.id}><span className={`dot ${t.state === 'paid' ? 'g' : t.state === 'awaiting_payment' || t.state === 'opening' ? 'y' : 'm'}`}>{t.state === 'paid' ? <InIcon /> : <ClockIcon />}</span>
              <div className="t"><b>Bank transfer</b><span>{time(t.created_at)}</span></div>
              <div className="v"><b className="num">{naira(t.amount_kobo)}</b><span className={t.state === 'paid' ? 'ok' : ''}>{topUpWord[t.state] ?? t.state}</span></div>
            </li>
          ))}
        </ul>
      </section>
    ))}</>
  const shown = purse.movements.filter(m => filter === 'all' || (filter === 'in' ? m.amount_kobo > 0 : m.amount_kobo < 0))
  if (shown.length === 0) return <p className="none">{purse.movements.length ? 'Nothing here.' : 'Nothing yet. Money you add and pay shows here.'}</p>
  return <>{groups(shown, m => m.at).map(([day, list]) => (
    <section key={day}>
      <h3 className="day">{day}</h3>
      <ul className="rows">
        {list.map((m, i) => {
          const [tone, ic] = icon(m)
          return (
            <li key={i}><span className={`dot ${tone}`}>{ic}</span>
              <div className="t"><b>{title(m)}</b><span>{time(m.at)}</span></div>
              <div className="v"><b className={`num${m.amount_kobo > 0 ? ' ok' : ''}`}>{m.amount_kobo > 0 ? '+' : ''}{naira(m.amount_kobo)}</b>
                <span className={m.amount_kobo > 0 ? 'ok' : ''}>{m.amount_kobo > 0 ? 'Received' : 'Paid'}</span></div>
            </li>
          )
        })}
      </ul>
    </section>
  ))}</>
}

function Filters({ value, set, all }: { value: Filter; set: (f: Filter) => void; all: boolean }) {
  const list: [Filter, string][] = all ? [['all', 'All'], ['in', 'In'], ['out', 'Out'], ['top-ups', 'Top-ups']] : [['all', 'Activity'], ['top-ups', 'Top-ups']]
  return (
    <div className="pills" role="group" aria-label="Show">
      {list.map(([f, label]) => <button key={f} type="button" aria-pressed={value === f} onClick={() => set(f)}>{label}</button>)}
    </div>
  )
}

/** A line of the balance over the last 30 days, drawn from the movements. */
function Line({ points }: { points: number[] }) {
  const w = 700, h = 150, max = Math.max(...points, 1)
  const step = w / Math.max(points.length - 1, 1)
  const p = points.map((v, i) => `${(i * step).toFixed(1)},${(h - 8 - (v / max) * (h - 20)).toFixed(1)}`).join(' ')
  return (
    <svg className="line" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,${h} ${p} ${w},${h}`} className="area" />
      <polyline points={p} className="stroke" />
    </svg>
  )
}

export function Wallet({ purse, name, openFund, checklist }: { purse: Purse; name: string; openFund: boolean; checklist: Checklist | null }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sheet, setSheet] = useState<SheetName>(openFund ? 'fund' : null)
  useEffect(() => { if (openFund) setSheet('fund') }, [openFund])
  const close = useCallback(() => {
    setSheet(null)
    if (location.search.includes('fund')) history.replaceState(null, '', '/')
  }, [])

  const [whole, kobo] = naira(purse.balance_kobo).split('.')
  const interest = purse.movements.filter(m => m.kind === 'interest').reduce((a, m) => a + m.amount_kobo, 0)
  const rate = purse.interest_rate_bps > 0 ? (purse.interest_rate_bps / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 }) : null
  const waiting = purse.top_ups.find(t => t.state === 'awaiting_payment' && Date.parse(t.expires_at) > Date.now())
  const month = monthTotals(purse.movements)
  const line = balanceLine(purse.balance_kobo, purse.movements)
  const change = line[line.length - 1] - line[0]
  const steps = (checklist?.steps ?? []).filter(s => s.state !== 'unavailable').slice(0, 5)
  const monthName = new Intl.DateTimeFormat('en-NG', { month: 'long', timeZone: zone }).format(new Date())
  const purseFor = name ? `For ${name}` : 'For your care'

  const waitingNote = waiting && (
    <div className="tile notice">
      <span className="dot y"><ClockIcon /></span>
      <div className="grow"><b>Waiting for {naira(waiting.total_kobo)}</b>
        <span>{waiting.account_number ? `Transfer to ${waiting.bank_name} ${waiting.account_number}, until ${time(waiting.expires_at)}.` : 'Your transfer details are on the way.'}</span></div>
    </div>
  )

  return (
    <>
      {/* Phone */}
      <div className="phone-only">
        <div className="mark-top"><ZomeMark /></div>
        <div className="wcol">
          <button type="button" className="tile picker" onClick={() => setSheet('purses')}>
            <span className="coin" aria-hidden="true" />
            <span className="grow"><b>Care Purse</b><span>{purseFor}</span></span>
            <span className="chev"><ChevIcon /></span>
          </button>
          <section className="tile bal" aria-label="Purse balance">
            <p className="lbl">Purse balance</p>
            <p className="main num">{whole}.{kobo}</p>
            <p className="second num">
              <span className="dim">{naira(interest)}<small>interest</small></span>
              {rate && <span className="up">+{rate}%<small>a year</small></span>}
            </p>
          </section>
          <div className="acts3">
            <button type="button" className="tile act3" onClick={() => setSheet('fund')}>Fund<PlusIcon /></button>
            <button type="button" className="tile act3" onClick={() => setSheet('pay')}>Pay<ArrowIcon /></button>
            <button type="button" className="tile act3" onClick={() => setSheet('code')}>Code<CodeIcon /></button>
          </div>
          {waitingNote}
        </div>
        <Filters value={filter === 'top-ups' ? 'top-ups' : 'all'} set={setFilter} all={false} />
        <Activity purse={purse} filter={filter === 'top-ups' ? 'top-ups' : 'all'} />
      </div>

      {/* Wide screen: the bento grid */}
      <div className="bento wide-only">
        <button type="button" className="b b-bal" onClick={() => setSheet('purses')}>
          <span className="pk"><span className="coin" aria-hidden="true" /><span><b>Care Purse</b><span>{purseFor}</span></span><span className="chev"><ChevIcon /></span></span>
          <span className="m num">{whole}.{kobo}</span>
          <span className="s num"><span className="dim">{naira(interest)}<small>interest</small></span>{rate && <span className="up">+{rate}%<small>a year</small></span>}</span>
        </button>
        <button type="button" className="b b-act b-a1" onClick={() => setSheet('fund')}>Fund<PlusIcon /></button>
        <button type="button" className="b b-act b-a2" onClick={() => setSheet('pay')}>Pay<ArrowIcon /></button>
        <button type="button" className="b b-act b-a3 b-brand" onClick={() => setSheet('code')}>Pay code<CodeIcon /></button>
        <section className="b b-chart" aria-label="Balance, last 30 days">
          <p className="mut">Balance, last 30 days</p>
          <p className="big num">{change >= 0 ? '+' : ''}{naira(change)}</p>
          <Line points={line} />
        </section>
        <section className="b b-stat b-in"><p className="mut">Money in · {monthName}</p><p className="n num">{naira(month.in, true)}</p></section>
        <section className="b b-stat b-out"><p className="mut">Paid for care</p><p className="n num">{naira(month.out, true)}</p></section>
        <section className="b b-acts">
          <div className="hd"><h2>Activity</h2><Filters value={filter} set={setFilter} all /></div>
          {waitingNote}
          <div className="scroll"><Activity purse={purse} filter={filter} /></div>
        </section>
        <section className="b b-fam">
          <h2>Family can add to it</h2>
          <p>Share a link, and anyone can give for your care by bank transfer.</p>
          <span className="soon">Coming soon</span>
        </section>
        <section className="b b-list">
          <h2>Get the most from Zome</h2>
          {steps.length === 0 ? <p className="mut">Your checklist shows here.</p> : (
            <ul>{steps.map(s => (
              <li key={s.id} className={s.state}><i aria-hidden="true">{s.state === 'done' ? <CheckIcon /> : null}</i>{stepWord[s.id] ?? s.id}
                {s.state === 'waiting' && <span className="mut"> · checking</span>}</li>
            ))}</ul>
          )}
          {checklist && <p className="mut pct">{checklist.done} of {checklist.total} done</p>}
        </section>
      </div>

      {sheet === 'fund' && <FundSheet onClose={close} />}
      {sheet === 'purses' && (
        <Sheet onClose={close} light>
          <h2 className="sheet-title">Your purses</h2>
          <div className="stack">
            <div className="pcard">
              <div className="hd"><span className="coin" aria-hidden="true" /><div><b>Care Purse</b><span>{purseFor}</span></div>
                <span className="tick" aria-label="Chosen"><CheckIcon /></span></div>
              <div className="ft"><Link href="/profile" onClick={close}>Manage</Link><span className="n num">{whole}.{kobo}</span></div>
            </div>
          </div>
          <p className="later">Health money from an employer on Zome for Teams will show here as its own purse.</p>
        </Sheet>
      )}
      {(sheet === 'pay' || sheet === 'code') && (
        <Sheet title={sheet === 'pay' ? 'Pay for care' : 'Pay code'} onClose={close}>
          <p className="big-note">{sheet === 'pay'
            ? 'Paying a clinic, pharmacy or lab from the web is coming next. Until then, pay from the Zome app.'
            : 'Showing a pay code at the counter is coming to the web next. Until then, use the Zome app.'}</p>
          <button type="button" className="btn lg wide white" onClick={close}>OK</button>
        </Sheet>
      )}
    </>
  )
}
