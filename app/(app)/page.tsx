import { checklist, me, purse } from '@/server/api'
import { PurseView } from './purse'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Care Purse · Zome' }

export default async function Home({ searchParams }: { searchParams: Promise<{ fund?: string }> }) {
  const [who, p, q, list] = await Promise.all([me(), purse(), searchParams, checklist()])
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  const first = who?.nickname?.trim() || who?.full_name?.trim().split(/\s+/)[0] || ''
  if (!p) return (
    <div className="card">
      <h2>Care Purse isn’t open to you yet</h2>
      <p className="mut note">We’re opening Care Purse to people in stages. We’ll email you when yours is ready.</p>
    </div>
  )
  return <PurseView purse={p} name={name} first={first} openFund={q.fund === '1'} checklist={list} />
}
