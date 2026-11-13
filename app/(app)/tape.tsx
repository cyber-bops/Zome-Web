'use client'

import { useState } from 'react'
import type { Movement } from '@/server/api'
import { naira } from '@/lib/money'
import { movementStamp, movementTitle, movementWhat } from '@/lib/words'
import { ZomeMark } from '../mark'
import { Sheet } from './sheet'

// The receipt tape: every movement as a printed line, bills paid stamped,
// the month's totals at the foot. Tap a line for its receipt.

const zone = 'Africa/Lagos'
const day = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: zone }).format(new Date(iso)).toUpperCase()
const signed = (k: number) => (k > 0 ? '+' : '−') + naira(Math.abs(k)).slice(1)
export type Filter = 'all' | 'in' | 'out'

/** `latest`: only the newest lines, without the heading and totals (Purse's short strip). */
export function Tape({ movements, balance, name, title = 'ZOME CARE PURSE', filter = 'all', onlyIn, latest }: {
  movements: Movement[]; balance: number; name: string; title?: string; filter?: Filter; onlyIn?: boolean; latest?: number
}) {
  const [open, setOpen] = useState<Movement | null>(null)
  const f: Filter = onlyIn ? 'in' : filter
  const all = movements.filter(m => f === 'all' || (f === 'in' ? m.amount_kobo > 0 : m.amount_kobo < 0))
  const shown = latest ? all.slice(0, latest) : all
  const inn = movements.filter(m => m.amount_kobo > 0).reduce((a, m) => a + m.amount_kobo, 0)
  const out = movements.filter(m => m.amount_kobo < 0).reduce((a, m) => a + m.amount_kobo, 0)
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: zone }).format(new Date()).toUpperCase()
  return (
    <>
      <div className={`tape${latest ? ' short' : ''}`}><div className="paper">
        {!latest && <><div className="ph"><ZomeMark /><b>{title}</b><span>{name ? `${name.toUpperCase()} · ` : ''}{month}</span></div>
        <div className="dash" /></>}
        <div className="lines">
          {shown.length === 0 ? <p className="none">{movements.length ? 'Nothing here.' : 'Nothing yet. When you add or pay, your receipts will show here.'}</p>
            : shown.map((m, i) => {
              const st = movementStamp(m)
              return (
                <button key={i} type="button" className={`ln${st ? ' stamped' : ''}`} onClick={() => setOpen(m)}>
                  <span className="d">{day(m.at)}</span>
                  <span className="w"><b>{movementTitle(m)}</b><span>{movementWhat(m)}</span></span>
                  <span className="a">{signed(m.amount_kobo)}</span>
                  {st && <span className={`stamp${st.tone === 'green' ? ' g' : ''}`}>{st.word}</span>}
                </button>
              )
            })}
        </div>
        {!latest && <><div className="dash" />
        <div className="tot">
          <span className="k">IN</span><span>{inn ? signed(inn) : '0.00'}</span>
          <span className="k">OUT</span><span>{out ? signed(out) : '0.00'}</span>
          <span className="k btk">BALANCE</span><span className="bt">{naira(balance)}</span>
        </div></>}
        <div className="bars" aria-hidden="true" />
        {!latest && <p className="pf">KEPT FOR CARE</p>}
      </div></div>
      {open && <Receipt m={open} onClose={() => setOpen(null)} />}
    </>
  )
}

export function Receipt({ m, onClose }: { m: Movement; onClose: () => void }) {
  const st = movementStamp(m)
  return (
    <Sheet eyebrow={day(m.at)} title={movementTitle(m)} onClose={onClose} foot={<button type="button" className="btn span" onClick={onClose}>Done</button>}>
      <div className="big-amt"><span className="lbl">{m.amount_kobo > 0 ? 'Into your purse' : 'From your purse'}</span><b className={m.amount_kobo > 0 ? 'in' : ''}>{signed(m.amount_kobo)}</b></div>
      <dl className="kv">
        <div><dt>What</dt><dd>{movementWhat(m)}</dd></div>
        <div><dt>When</dt><dd>{new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: zone }).format(new Date(m.at))}</dd></div>
        {st && <div><dt>Status</dt><dd>{st.word === 'PAID' ? 'Paid' : 'Benefit'}</dd></div>}
      </dl>
    </Sheet>
  )
}
