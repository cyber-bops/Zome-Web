'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, PlusIcon, UserIcon } from '../icons'
import { ZomeMark } from '../mark'

// Health (the path and alerts) joins these once it is on the web (ADR-0053 §5).
const pages = [
  { href: '/', label: 'Care Purse', icon: HomeIcon },
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

/** The phone's floating bar: the pages on the left, Fund on the right. */
export function BottomBar() {
  const path = usePathname()
  return (
    <nav className="bar" aria-label="Main">
      {pages.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="rb" aria-label={label} aria-current={isOn(path, href) ? 'page' : undefined}><Icon /></Link>
      ))}
      <Link href="/?fund=1" className="rb plus" aria-label="Add money" scroll={false}><PlusIcon /></Link>
    </nav>
  )
}
