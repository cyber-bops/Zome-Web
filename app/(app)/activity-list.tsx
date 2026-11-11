'use client'

import type { Movement, Purse, TopUp } from '@/server/api'
import { naira } from '@/lib/money'
export { stepWord } from '@/lib/words'
import { ClockIcon, GiftIcon, InIcon, OutIcon, SparkIcon } from '../icons'

// The pieces Home and Activity share: activity grouped by day, its filters,
// and the balance line. Words are the iOS app's (CarePurseView,
// ProfileChecklistView).

const zone = 'Africa/Lagos'
const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date(iso))
function dayName(iso: string): string {
  const k = dayKey(iso), now = Date.now()
  if (k === dayKey(new Date(now).toISOString())) return 'Today'
  if (k === dayKey(new Date(now - 864e5).toISOString())) return 'Yesterday'
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', timeZone: zone }).format(new Date(iso))
}
export const time = (iso: string) => new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date(iso))

function groups<T>(items: T[], at: (t: T) => string): [string, T[]][] {
  const out: [string, T[]][] = []
  for (const it of items) {
    const name = dayName(at(it))
    const last = out[out.length - 1]
    if (last && last[0] === name) last[1].push(it); else out.push([name, [it]])
  }
  return out
}

const named: Record<string, string> = { top_up: 'Added', reversal: 'Bank reversal', interest: 'Interest', cashback: 'Cashback', payment: 'Paid a bill' }
const title = (m: Movement) => m.kind === 'team' ? (m.from ? `From ${m.from}` : 'From your employer') : named[m.kind] ?? (m.amount_kobo >= 0 ? 'Received' : 'Paid')
const icon = (m: Movement) => m.kind === 'team' ? ['y', <GiftIcon key="i" />] as const
  : m.kind === 'interest' || m.kind === 'cashback' ? ['g', <SparkIcon key="i" />] as const
  : m.amount_kobo < 0 ? ['', <OutIcon key="i" />] as const : ['', <InIcon key="i" />] as const
const topUpWord: Record<string, string> = { opening: 'Setting up', awaiting_payment: 'Waiting', part_paid: 'Part paid', paid: 'Added', failed: 'Didn’t go through', reversed: 'Reversed', expired: 'Expired' }

export type Filter = 'all' | 'in' | 'out' | 'top-ups'

export function Activity({ purse, filter }: { purse: Purse; filter: Filter }) {
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

export function Filters({ value, set, all }: { value: Filter; set: (f: Filter) => void; all: boolean }) {
  const list: [Filter, string][] = all ? [['all', 'All'], ['in', 'In'], ['out', 'Out'], ['top-ups', 'Top-ups']] : [['all', 'Activity'], ['top-ups', 'Top-ups']]
  return (
    <div className="pills" role="group" aria-label="Show">
      {list.map(([f, label]) => <button key={f} type="button" aria-pressed={value === f} onClick={() => set(f)}>{label}</button>)}
    </div>
  )
}

/** A line of the balance over the last 30 days, drawn from the movements. */
export function Line({ points }: { points: number[] }) {
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

