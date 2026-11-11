'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, PlusIcon, UserIcon } from '../icons'

// Health (the path and alerts) joins these once it is on the web (ADR-0053 §5).
const pages = [
  { href: '/', label: 'Care Purse', icon: HomeIcon, group: 'Menu' },
  { href: '/profile', label: 'Profile', icon: UserIcon, group: 'Account' },
]

const isOn = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href))

export function SideNav() {
  const path = usePathname()
  return (
    <nav aria-label="Main">
      {['Menu', 'Account'].map(group => (
        <div key={group}>
          <p className="grp">{group}</p>
          {pages.filter(p => p.group === group).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="nav" aria-current={isOn(path, href) ? 'page' : undefined}><Icon />{label}</Link>
          ))}
        </div>
      ))}
    </nav>
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

export function Crumbs() {
  const path = usePathname()
  const page = pages.find(p => isOn(path, p.href)) ?? pages[0]
  return (
    <div className="crumbbar">
      <span>Zome <span aria-hidden="true">/</span> <b>{page.label}</b></span>
    </div>
  )
}
