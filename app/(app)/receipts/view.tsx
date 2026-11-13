'use client'

import { useState } from 'react'
import type { Movement, Purse } from '@/server/api'
import { naira } from '@/lib/money'
import { movementStamp, movementTitle, movementWhat } from '@/lib/words'
import { Receipt, Tape } from '../tape'

const zone = 'Africa/Lagos'
const day = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', timeZone: zone }).format(new Date(iso))
const when = (iso: string) => new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date(iso))

// Every movement as a searchable list, beside the whole tape.
export function ReceiptsView({ purse, name }: { purse: Purse | null; name: string }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Movement | null>(null)
  if (!purse) return <div className="card"><h2>Care Purse isn’t open to you yet</h2></div>
  const norm = (s: string) => s.toLowerCase().replace(/[,₦\s]/g, '')
  const rows = purse.movements.filter(m => !q || norm(movementTitle(m) + movementWhat(m) + (Math.abs(m.amount_kobo) / 100)).includes(norm(q)))
  return (
    <div className="view">
      <div>
        <p className="lbl">Receipts</p>
        <h1 className="page-h">Every naira, on paper.</h1>
        <p className="page-s">Tap any line for its receipt. Bills you pay are stamped.</p>
        <label className="search"><span className="lbl">Find</span><input id="find" value={q} onChange={e => setQ(e.target.value)} placeholder="Interest, 4,200…" autoComplete="off" /></label>
        <div className="list">
          {rows.length === 0 ? <p className="none">{purse.movements.length ? 'No receipt matches that.' : 'Nothing yet. When you add or pay, your receipts will show here.'}</p>
            : rows.map((m, i) => {
              const st = movementStamp(m)
              return (
                <button key={i} type="button" className="item" onClick={() => setOpen(m)}>
                  <span className="pin">{day(m.at)}</span>
                  <span><b>{movementTitle(m)}{st && <span className={`tag${st.tone === 'green' ? ' g' : ''}`}>{st.word}</span>}</b><span className="s">{movementWhat(m)} · {when(m.at)}</span></span>
                  <span className={`sum${m.amount_kobo > 0 ? ' in' : ''}`}>{m.amount_kobo > 0 ? '+' : '−'}{naira(Math.abs(m.amount_kobo))}</span>
                </button>
              )
            })}
        </div>
      </div>
      <div className="tape-wrap"><Tape movements={purse.movements} balance={purse.balance_kobo} name={name} /></div>
      {open && <Receipt m={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
