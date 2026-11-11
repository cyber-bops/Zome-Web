import { checklist, me, purse } from '@/server/api'
import { BankCard } from '../link'
import { AccountActions } from './controls'
import { Steps } from './steps'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'You · Zome' }

export default async function ProfilePage() {
  const [who, list, p] = await Promise.all([me(), checklist(), purse()])
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  const initials = (name || who?.email || 'Z').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
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
        {list && <Steps list={list} />}
        <BankCard purse={p} />
      </div>
    </div>
  )
}
