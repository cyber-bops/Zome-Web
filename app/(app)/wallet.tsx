'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Movement, Purse, TopUp } from '@/server/api'
import { naira } from '@/lib/money'
import { ArrowIcon, CheckIcon, ChevIcon, ClockIcon, CodeIcon, GiftIcon, InIcon, OutIcon, PlusIcon, SparkIcon } from '../icons'
import { ZomeMark } from '../mark'
import { FundSheet } from './fund'
import { Sheet } from './sheet'

// Home: the Care Purse, in the wallet look the owner chose (11 November 2026).

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

// The iOS app's words for each movement (CarePurseView).
const named: Record<string, string> = { top_up: 'Added', reversal: 'Bank reversal', interest: 'Interest', cashback: 'Cashback', payment: 'Paid a bill' }
const title = (m: Movement) => m.kind === 'team' ? (m.from ? `From ${m.from}` : 'From your employer') : named[m.kind] ?? (m.amount_kobo >= 0 ? 'Received' : 'Paid')
const icon = (m: Movement) => m.kind === 'team' ? ['y', <GiftIcon key="i" />] as const
  : m.kind === 'interest' || m.kind === 'cashback' ? ['g', <SparkIcon key="i" />] as const
  : m.amount_kobo < 0 ? ['', <OutIcon key="i" />] as const : ['', <InIcon key="i" />] as const

const topUpWord: Record<string, string> = { opening: 'Setting up', awaiting_payment: 'Waiting', part_paid: 'Part paid', paid: 'Added', failed: 'Didn’t go through', reversed: 'Reversed', expired: 'Expired' }

type Tab = 'activity' | 'top-ups'

export function Wallet({ purse, name, openFund }: { purse: Purse; name: string; openFund: boolean }) {
  const [tab, setTab] = useState<Tab>('activity')
  const [sheet, setSheet] = useState<null | 'fund' | 'purses' | 'pay' | 'code'>(openFund ? 'fund' : null)
  useEffect(() => { if (openFund) setSheet('fund') }, [openFund])
  const close = useCallback(() => {
    setSheet(null)
    if (location.search.includes('fund')) history.replaceState(null, '', '/')
  }, [])

  const [whole, kobo] = naira(purse.balance_kobo).split('.')
  const interest = purse.movements.filter(m => m.kind === 'interest').reduce((a, m) => a + m.amount_kobo, 0)
  const rate = purse.interest_rate_bps > 0 ? (purse.interest_rate_bps / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 }) : null
  const waiting = purse.top_ups.find(t => t.state === 'awaiting_payment' && Date.parse(t.expires_at) > Date.now())

  return (
    <>
      <div className="mark-top"><ZomeMark /></div>
      <div className="wgrid">
        <div className="wcol">
          <button type="button" className="tile picker" onClick={() => setSheet('purses')}>
            <span className="coin" aria-hidden="true" />
            <span className="grow"><b>Care Purse</b><span>{name ? `For ${name}` : 'For your care'}</span></span>
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
          {waiting && (
            <div className="tile notice">
              <span className="dot y"><ClockIcon /></span>
              <div className="grow"><b>Waiting for {naira(waiting.total_kobo)}</b>
                <span>{waiting.account_number ? `Transfer to ${waiting.bank_name} ${waiting.account_number}, until ${time(waiting.expires_at)}.` : 'Your transfer details are on the way.'}</span></div>
            </div>
          )}
        </div>

        <div>
          <div className="pills" role="group" aria-label="Show">
            <button type="button" aria-pressed={tab === 'activity'} onClick={() => setTab('activity')}>Activity</button>
            <button type="button" aria-pressed={tab === 'top-ups'} onClick={() => setTab('top-ups')}>Top-ups</button>
          </div>
          {tab === 'activity' && (purse.movements.length === 0
            ? <p className="none">Nothing yet. Money you add and pay shows here.</p>
            : groups(purse.movements, m => m.at).map(([day, list]) => (
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
            )))}
          {tab === 'top-ups' && (purse.top_ups.length === 0
            ? <p className="none">No top-ups yet. Tap Fund to add money.</p>
            : groups(purse.top_ups, t => t.created_at).map(([day, list]) => (
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
            )))}
        </div>
      </div>

      {sheet === 'fund' && <FundSheet onClose={close} />}
      {sheet === 'purses' && (
        <Sheet onClose={close} light>
          <h2 className="sheet-title">Your purses</h2>
          <div className="stack">
            <div className="pcard">
              <div className="hd"><span className="coin" aria-hidden="true" /><div><b>Care Purse</b><span>{name ? `For ${name}` : 'For your care'}</span></div>
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
