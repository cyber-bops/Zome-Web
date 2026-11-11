'use client'

import { useState } from 'react'
import { stepWord } from '@/lib/words'
import type { Checklist } from '@/server/api'
import { CheckIcon } from '../../icons'
import { onTheWeb, SetupSheet } from '../setup'

// The set-up checklist. Linking a bank account is in the app for now; the
// other steps are done here.
export function Steps({ list }: { list: Checklist }) {
  const [open, setOpen] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const steps = list.steps.filter(s => s.state !== 'unavailable')
  return (
    <section className="sheet-paper">
      <p className="lbl">Set up · {list.done} of {list.total} done</p>
      {steps.map(s => (
        <div key={s.id} className={`step ${s.state}`}>
          <i aria-hidden="true">{s.state === 'done' ? <CheckIcon /> : null}</i>
          <span>{stepWord[s.id] ?? s.id}</span>
          {s.state === 'waiting' && <span className="lbl">Checking</span>}
          {s.state === 'to_do' && (onTheWeb.has(s.id)
            ? <button type="button" className="btn small-btn" onClick={() => setOpen(s.id)}>Add</button>
            : <span className="lbl">In the app</span>)}
        </div>
      ))}
      {open && <SetupSheet step={open} onClose={() => setOpen(null)} onDone={t => { setToast(t); setTimeout(() => setToast(null), 2600) }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  )
}
