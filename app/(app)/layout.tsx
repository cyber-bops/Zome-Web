import { redirect } from 'next/navigation'
import { me } from '@/server/api'
import { BottomBar, TopBar } from './nav'

// Every page behind sign-in: a floating bar on phones, a top bar on wide
// screens; the same tiles on both.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const who = await me()
  if (!who) redirect('/sign-in')
  const first = who.nickname?.trim() || who.full_name?.trim().split(/\s+/)[0] || ''
  return (
    <div className="shell w">
      <TopBar initial={(first || who.email || 'Z')[0].toUpperCase()} />
      <main className="app">{children}</main>
      <BottomBar />
    </div>
  )
}
