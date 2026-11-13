'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Find care joins these once it works on the web.
const pages = [
  { href: '/', label: 'Purse' },
  { href: '/receipts', label: 'Receipts' },
  { href: '/care-fund', label: 'Care Fund' },
  { href: '/profile', label: 'You' },
]
const isOn = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href))

export function TopLinks() {
  const path = usePathname()
  return <nav className="links" aria-label="Main">{pages.map(p => <Link key={p.href} href={p.href} aria-current={isOn(path, p.href) ? 'page' : undefined}>{p.label}</Link>)}</nav>
}

export function Tabs() {
  const path = usePathname()
  return <nav className="tabs" aria-label="Main">{pages.map(p => <Link key={p.href} href={p.href} aria-current={isOn(path, p.href) ? 'page' : undefined}>{p.label}</Link>)}</nav>
}
