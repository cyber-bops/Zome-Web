import { checklist, me } from '@/server/api'
import { stepWord } from '@/lib/words'
import { CheckIcon } from '../../icons'
import { AccountActions } from './controls'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'You · Zome' }

export default async function ProfilePage() {
  const [who, list] = await Promise.all([me(), checklist()])
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  const initials = (name || who?.email || 'Z').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const steps = (list?.steps ?? []).filter(s => s.state !== 'unavailable')
  return (
    <div className="view">
      <div>
        <p className="lbl">You</p>
        <h1 className="page-h">{name || 'Your account'}</h1>
        <p className="page-s mono">{who?.email}</p>
        <section className="sheet-paper">
          <div className="who"><span className="avatar">{initials}</span><div className="grow"><b>{name || 'Your account'}</b><span>{who?.email}</span></div></div>
          <div className="row"><span className="mut">Signing in</span></div>
          <AccountActions />
        </section>
      </div>
      <div>
        {list && (
          <section className="sheet-paper">
            <p className="lbl">Set up · {list.done} of {list.total} done</p>
            {steps.map(s => (
              <div key={s.id} className={`step ${s.state}`}>
                <i aria-hidden="true">{s.state === 'done' ? <CheckIcon /> : null}</i>
                <span>{stepWord[s.id] ?? s.id}</span>
                {s.state === 'waiting' && <span className="lbl">Checking</span>}
                {s.state === 'to_do' && <span className="lbl">In the app</span>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
