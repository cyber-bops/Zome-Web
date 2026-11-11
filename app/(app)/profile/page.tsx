import { me } from '@/server/api'
import { AccountActions, LookSwitch } from './controls'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Profile · Zome' }

export default async function ProfilePage() {
  const who = await me()
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  return (
    <div className="pgrid">
      <div className="wcol">
        <section className="tile pcard me-card">
          <div className="hd"><span className="avatar lg">{(name || who?.email || 'Z')[0].toUpperCase()}</span>
            <div className="grow"><b>{name || 'Your account'}</b><span>{who?.email}</span></div></div>
          <p className="me-note">Your full name comes from your BVN or NIN once you verify, and stays as your bank has it.</p>
        </section>
      </div>
      <div className="wcol">
        <section className="tile set">
          <h2>Look</h2>
          <div className="row"><div><b>Appearance</b><span className="s">Light, dark, or as your device is.</span></div><LookSwitch /></div>
        </section>
        <section className="tile set">
          <h2>Signing in</h2>
          <AccountActions />
        </section>
      </div>
    </div>
  )
}
