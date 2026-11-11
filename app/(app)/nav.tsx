'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, ListIcon, PlusIcon, UserIcon } from '../icons'
import { ZomeMark } from '../mark'

// Health (the path and alerts) joins these once it is on the web (ADR-0053 §5).
const pages = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/activity', label: 'Activity', icon: ListIcon },
  { href: '/profile', label: 'Profile', icon: UserIcon },
]

const isOn = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href))

/** The wide screen's top bar: the mark, the pages as pills, Add money and the person. */
export function TopBar({ initial }: { initial: string }) {
  const path = usePathname()
  return (
    <header className="topnav">
      <Link href="/" className="brand flat"><span className="badge"><ZomeMark /></span>Zome</Link>
      <nav className="tn-pills" aria-label="Main">
        {pages.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={isOn(path, href) ? 'page' : undefined}>{label}</Link>
        ))}
      </nav>
      <div className="tn-end">
        <Link href="/?fund=1" className="btn" scroll={false}><PlusIcon />Add money</Link>
        <Link href="/profile" className="avatar" aria-label="Profile">{initial}</Link>
      </div>
    </header>
  )
}

/** The phone's tab bar: Home and Activity, Add money in the middle, Profile. */
export function BottomBar() {
  const path = usePathname()
  const tab = (p: (typeof pages)[number]) => {
    const Icon = p.icon
    return <Link key={p.href} href={p.href} className="tb" aria-current={isOn(path, p.href) ? 'page' : undefined}><Icon />{p.label}</Link>
  }
  return (
    <nav className="tabbar" aria-label="Main">
      {pages.slice(0, 2).map(tab)}
      <Link href="/?fund=1" className="fab" aria-label="Add money" scroll={false}><PlusIcon /></Link>
      {pages.slice(2).map(tab)}
    </nav>
  )
}
