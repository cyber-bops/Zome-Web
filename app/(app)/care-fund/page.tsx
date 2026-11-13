import { headers } from 'next/headers'
import { giftLink, me, myCareFund, purse } from '@/server/api'
import { FamilyView, type CareFundMode } from '../family/view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Care Fund · Zome' }

// Care Fund: Family (the private link) and Public (the fundraiser), one page.
// It opens on Public when the person has a fund, else on Family.
export default async function CareFundPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const [who, link, p, h, fund, q] = await Promise.all([me(), giftLink(), purse(), headers(), myCareFund(), searchParams])
  const host = process.env.ZOME_WEB_ORIGIN ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  const first = who?.nickname?.trim() || who?.full_name?.trim().split(/\s+/)[0] || ''
  const mode: CareFundMode = q.mode === 'public' || q.mode === 'family' ? q.mode : fund?.fund ? 'public' : 'family'
  return <FamilyView link={link} origin={host} first={first} gifts={(p?.movements ?? []).filter(m => m.kind === 'gift')} open={!!p} fund={fund} mode={mode} />
}
