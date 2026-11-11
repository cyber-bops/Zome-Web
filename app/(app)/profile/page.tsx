import { me } from '@/server/api'
import { AccountActions, LookSwitch } from './controls'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Profile · Zome' }

export default async function ProfilePage() {
  const who = await me()
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  return (
    <>
      <header className="page-hd"><h1>Your <span className="tone">profile</span></h1></header>
      <div className="grid2">
        <section className="card">
          <div className="who-big">
            <span className="avatar lg">{(name || who?.email || 'Z')[0].toUpperCase()}</span>
            <div className="grow"><h2>{name || 'Your account'}</h2><p className="muted">{who?.email}</p></div>
          </div>
        </section>
        <section className="card">
          <div className="row"><div><b>Look</b><span className="s">Light, dark, or as your device is.</span></div><LookSwitch /></div>
        </section>
      </div>
      <section className="card gap">
        <h2>Signing in</h2>
        <AccountActions />
      </section>
    </>
  )
}
