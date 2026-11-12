import { headers } from 'next/headers'
import { giftLink, me, myCareFund, purse } from '@/server/api'
import { FamilyView } from './view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Family · Zome' }

export default async function FamilyPage() {
  const [who, link, p, h, fund] = await Promise.all([me(), giftLink(), purse(), headers(), myCareFund()])
  const host = process.env.ZOME_WEB_ORIGIN ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  const first = who?.nickname?.trim() || who?.full_name?.trim().split(/\s+/)[0] || ''
  return <FamilyView link={link} origin={host} first={first} gifts={(p?.movements ?? []).filter(m => m.kind === 'gift')} open={!!p} fund={fund} />
}
