'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Checklist, Purse } from '@/server/api'
import { naira } from '@/lib/money'
import { balanceLine, monthTotals } from '@/lib/purse'
import { greeting } from '@/lib/time'
import { ArrowIcon, CheckIcon, ChevIcon, ClockIcon, CodeIcon, PlusIcon } from '../icons'
import { ZomeMark } from '../mark'
import { Activity, Filters, Line, stepWord, time, type Filter } from './activity-list'
import { FundSheet } from './fund'
import { Sheet } from './sheet'

// Home: the Care Purse. On a phone, the redesign of 11 November 2026; on a
// wide screen, the bento grid the owner chose ("B").

type SheetName = null | 'fund' | 'purses' | 'pay' | 'code'
const zone = 'Africa/Lagos'

export function Wallet({ purse, name, first, openFund, checklist }: { purse: Purse; name: string; first: string; openFund: boolean; checklist: Checklist | null }) {
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
  const steps = (checklist?.steps ?? []).filter(s => s.state !== 'unavailable')
  const monthName = new Intl.DateTimeFormat('en-NG', { month: 'long', timeZone: zone }).format(new Date())
  const purseFor = name ? `For ${name}` : 'For your care'
  const pct = checklist ? Math.round((checklist.done / Math.max(checklist.total, 1)) * 100) : 0

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
      <div className="phone-only m-home">
        <header className="m-hdr">
          <span className="mk"><ZomeMark /></span>
          <div className="grow"><p>{greeting()}</p><b>{first || 'Welcome'}</b></div>
          <Link href="/profile" className="avatar" aria-label="Profile">{(first || 'Z')[0].toUpperCase()}</Link>
        </header>
        <button type="button" className="tile m-bal" onClick={() => setSheet('purses')}>
          <span className="pk"><span className="coin" aria-hidden="true" /><span className="grow"><b>Care Purse</b><span>{purseFor}</span></span><span className="chev"><ChevIcon /></span></span>
          <span className="m num">{whole}.{kobo}</span>
          <span className="s num"><span className="dim">{naira(interest)}<small>interest</small></span>{rate && <span className="up">+{rate}%<small>a year</small></span>}</span>
        </button>
        <div className="m-acts">
          <button type="button" className="tile m-act" onClick={() => setSheet('fund')}><PlusIcon />Fund</button>
          <button type="button" className="tile m-act" onClick={() => setSheet('pay')}><ArrowIcon />Pay</button>
          <button type="button" className="tile m-act" onClick={() => setSheet('code')}><CodeIcon />Pay code</button>
        </div>
        {waitingNote}
        <section className="tile m-chart" aria-label="Balance, last 30 days">
          <p className="mut">Balance, last 30 days</p>
          <p className="big num">{change >= 0 ? '+' : ''}{naira(change)}</p>
          <Line points={line} />
        </section>
        <div className="m-two">
          <section className="tile m-stat"><p className="mut">Money in · {monthName}</p><p className="n num">{naira(month.in, true)}</p></section>
          <section className="tile m-stat"><p className="mut">Paid for care</p><p className="n num">{naira(month.out, true)}</p></section>
        </div>
        {checklist && (
          <Link href="/profile" className="tile m-prog">
            <span className="grow"><b>Get the most from Zome</b>
              <span className="mut">{checklist.done} of {checklist.total} done</span>
              <svg className="meter" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><rect className="bg" width="100" height="6" rx="3" /><rect className="fg" width={pct} height="6" rx="3" /></svg></span>
            <ArrowIcon />
          </Link>
        )}
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
          <span className="soon">Coming soon</span>
        </section>
        <section className="b b-list">
          <h2>Get the most from Zome</h2>
          {steps.length === 0 ? <p className="mut">Your checklist shows here.</p> : (
            <ul>{steps.slice(0, 5).map(s => (
              <li key={s.id} className={s.state}><i aria-hidden="true">{s.state === 'done' ? <CheckIcon /> : null}</i>{stepWord[s.id] ?? s.id}
                {s.state === 'waiting' && <span className="mut"> · checking</span>}</li>
            ))}</ul>
          )}
          {checklist && <p className="mut pct">{checklist.done} of {checklist.total} done</p>}
        </section>
      </div>

      {sheet === 'fund' && <FundSheet onClose={close} />}
      {sheet === 'purses' && (
        <Sheet title="Your purses" onClose={close} narrow
          foot={<><Link href="/profile" className="btn secondary" onClick={close}>Manage</Link><button type="button" className="btn" onClick={() => setSheet('fund')}>Add money</button></>}>
          <div className="stack">
            <div className="pcard">
              <div className="hd"><span className="coin" aria-hidden="true" /><div><b>Care Purse</b><span>{purseFor}</span></div>
                <span className="tick" aria-label="Chosen"><CheckIcon /></span></div>
              <div className="ft"><span className="mut">Balance</span><span className="n num">{whole}.{kobo}</span></div>
            </div>
          </div>
        </Sheet>
      )}
      {(sheet === 'pay' || sheet === 'code') && (
        <Sheet narrow title={sheet === 'pay' ? 'Pay for care' : 'Pay code'} onClose={close}
          lede="Coming soon on the web. Use the Zome app for now." 
          foot={<button type="button" className="btn span" onClick={close}>OK</button>} />
      )}
    </>
  )
}
