import Link from 'next/link'
import { redirect } from 'next/navigation'
import { me } from '@/server/api'
import { ZomeMark } from '../mark'
import { BottomBar, Crumbs, SideNav } from './nav'

// Every page behind sign-in: a floating bar on phones; on laptops a sidebar
// and the page in an inset panel.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const who = await me()
  if (!who) redirect('/sign-in')
  const first = who.nickname?.trim() || who.full_name?.trim().split(/\s+/)[0] || ''
  return (
    <div className="shell w">
      <aside className="side">
        <div className="brand"><span className="badge"><ZomeMark /></span>Zome</div>
        <SideNav />
        <Link className="foot" href="/profile">
          <span className="avatar">{(first || who.email || 'Z')[0].toUpperCase()}</span>
          <div className="grow"><b>{first || 'Your account'}</b><span>{who.email}</span></div>
        </Link>
      </aside>
      <main className="app">
        <Crumbs />
        <div className="inner">{children}</div>
      </main>
      <BottomBar />
    </div>
  )
}
