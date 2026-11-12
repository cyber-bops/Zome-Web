'use client'

import { useState } from 'react'
import { call, Refused } from '@/lib/client'

// "Report" on every Care Fund page (ADR-0054 §7): goes to Zome's staff.
export function Report({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [problem, setProblem] = useState<string | null>(null)

  if (state === 'sent') return <p className="fund-report small">Thank you. Zome’s team will look at this fund.</p>
  if (!open) return <p className="fund-report"><button type="button" className="link-btn" onClick={() => setOpen(true)}>Report this fund</button></p>
  return (
    <form className="fund-report-form" onSubmit={async e => {
      e.preventDefault(); setState('busy'); setProblem(null)
      try { await call(`fund/${slug}/report`, 'POST', { reason, email }); setState('sent') }
      catch (err) { setProblem(err instanceof Refused ? err.message : 'That didn’t go through. Try again.'); setState('idle') }
    }}>
      <label className="label" htmlFor="r-why">What’s wrong?</label>
      <textarea id="r-why" className="field" rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} required />
      <label className="label" htmlFor="r-email">Your email (optional, if we may reply)</label>
      <input id="r-email" className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      {problem && <p className="err" role="alert">{problem}</p>}
      <div className="row-btns"><button type="button" className="btn soft" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="btn" disabled={state === 'busy' || !reason.trim()}>{state === 'busy' ? 'Sending…' : 'Send report'}</button></div>
    </form>
  )
}
