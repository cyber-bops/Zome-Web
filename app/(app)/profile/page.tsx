import { checklist, me } from '@/server/api'
import { CheckIcon, ArrowIcon } from '../../icons'
import { stepWord } from '@/lib/words'
import { AccountActions, LookSwitch } from './controls'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Profile · Zome' }

export default async function ProfilePage() {
  const [who, list] = await Promise.all([me(), checklist()])
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  const steps = (list?.steps ?? []).filter(s => s.state !== 'unavailable')
  return (
    <div className="m-page pgrid">
      <h1 className="m-title">Profile</h1>
      <div className="wcol">
        <section className="tile pcard me-card">
          <div className="hd"><span className="avatar lg">{(name || who?.email || 'Z')[0].toUpperCase()}</span>
            <div className="grow"><b>{name || 'Your account'}</b><span>{who?.email}</span></div></div>
        </section>
        {list && (
          <>
            <p className="day">Get the most from Zome · {list.done} of {list.total}</p>
            <ul className="tile m-steps">
              {steps.map(s => (
                <li key={s.id} className={s.state}>
                  <span className="dot">{s.state === 'done' ? <CheckIcon /> : <ArrowIcon />}</span>
                  <b>{stepWord[s.id] ?? s.id}</b>
                  {s.state === 'waiting' && <span className="mut">Checking</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="wcol">
        <p className="day">Look</p>
        <section className="tile set">
          <div className="row"><b>Appearance</b><LookSwitch /></div>
        </section>
        <p className="day">Signing in</p>
        <section className="tile set">
          <AccountActions />
        </section>
      </div>
    </div>
  )
}
