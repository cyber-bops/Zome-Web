'use client'

import { useEffect, useState } from 'react'
import { ZomeMark } from '../mark'

// The ticket that drops in on a string when money moves: paid, added. A
// punched hole, the side notches, a dark panel, the receipt's fields, an
// inked stamp, a barcode and a torn edge. Then the plain confirmation, with
// the details in one solid block of split cells.

export type Cell = { k: string; v: string; full?: boolean; good?: boolean }

/** Prints text a character at a time, after the ticket settles; all at once for reduced motion. */
function usePrinted(text: string, on: boolean) {
  const [shown, setShown] = useState(on ? '' : text)
  useEffect(() => {
    if (!on || matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(text); return }
    setShown(''); let i = 0, t: ReturnType<typeof setInterval>
    const start = setTimeout(() => { t = setInterval(() => { setShown(text.slice(0, ++i)); if (i >= text.length) clearInterval(t) }, 95) }, 650)
    return () => { clearTimeout(start); clearInterval(t) }
  }, [text, on])
  return shown
}

export function HangingTicket({ eyebrow, headline, stamp, green, fields, reference, title, cells, print, extra, below }: {
  eyebrow: string; headline: string; stamp?: string; green?: boolean
  fields: [string, string][]; reference: string; title?: string; cells?: Cell[]
  /** Print the headline in, as a till prints a code. */
  print?: boolean
  /** Under the fields, inside the ticket. */
  extra?: React.ReactNode
  /** In place of the confirmation. */
  below?: React.ReactNode
}) {
  const printed = usePrinted(headline, !!print)
  return (
    <div className="hang">
      <div className="string" aria-hidden="true" />
      <div className="ticket-hang" aria-hidden={print ? undefined : true}>
        <div className="tk tk-1">
          <div className="tk-brand"><b>Zome</b><ZomeMark /></div>
          <span className="pillmono">{eyebrow}</span>
          <div className="tk-art"><b className={print ? 'code-print' : undefined}>{printed}</b><i className="s1" /><i className="s2" /><i className="s3" /></div>
        </div>
        <div className={`tk tk-2${stamp ? ' stamped' : ''}`}>
          {stamp && <span className={`stamp big${green ? ' g' : ''}`}>{stamp}</span>}
          <div className="fields">{fields.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
          {extra}
        </div>
        <div className="tk tk-3"><div className="bars" /><div className="ref">{reference}</div></div>
      </div>
      {below ?? <div className="confirm">
        <svg className="verified" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 2l4.3 3.1 5.3-.3 1.9 5 4.7 2.4-.8 5.3L38 22l-3.1 4.3.3 5.3-5 1.9-2.4 4.7-5.3-.8L20 41l-4.3-3.6-5.3.8-2.4-4.7-5-1.9.3-5.3L0 22l2.6-4.5-.8-5.3 4.7-2.4 1.9-5 5.3.3z" />
          <path d="M13 20.5l4.5 4.5 9-9" className="tickmark" />
        </svg>
        <p className="ok">{title}</p>
        {cells && <div className="cells">{cells.map(c => <div key={c.k} className={c.full ? 'full' : ''}><span>{c.k}</span><b className={c.good ? 'in' : ''}>{c.v}</b></div>)}</div>}
      </div>}
    </div>
  )
}
