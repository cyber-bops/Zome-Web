import Link from 'next/link'
import { redirect } from 'next/navigation'
import { me } from '@/server/api'
import { ZomeMark } from '../mark'
import { IdleGuard } from './idle'
import { Tabs, TopLinks } from './nav'

// Every page behind sign-in: the wordmark, the pages in mono capitals, and
// the person's initials; on a phone the pages sit along the bottom.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const who = await me()
  if (!who) redirect('/sign-in')
  const name = who.full_name?.trim() || who.nickname?.trim() || ''
  const initials = (name || who.email || 'Z').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <>
      <header className="top">
        <Link href="/" className="wm"><ZomeMark />Zome</Link>
        <TopLinks />
        <Link href="/profile" className="me"><span className="name">{name}</span><span className="avatar">{initials}</span></Link>
      </header>
      <main className="app">{children}</main>
      <Tabs />
      <IdleGuard />
    </>
  )
}
