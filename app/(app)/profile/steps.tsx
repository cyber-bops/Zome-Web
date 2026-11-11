'use client'

import { useState } from 'react'
import { stepWord } from '@/lib/words'
import type { Checklist } from '@/server/api'
import { CheckIcon } from '../../icons'
import { BvnSheet } from '../bvn'

// The set-up checklist. The BVN is added here on the web; the other steps
// are in the app for now.
export function Steps({ list }: { list: Checklist }) {
  const [open, setOpen] = useState(false)
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
          {s.state === 'to_do' && (s.id === 'bvn'
            ? <button type="button" className="btn small-btn" onClick={() => setOpen(true)}>Add</button>
            : <span className="lbl">In the app</span>)}
        </div>
      ))}
      {open && <BvnSheet onClose={() => setOpen(false)} onDone={t => { setToast(t); setTimeout(() => setToast(null), 2600) }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  )
}
