import { checklist, me, purse } from '@/server/api'
import { Wallet } from './wallet'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Care Purse · Zome' }

export default async function Home({ searchParams }: { searchParams: Promise<{ fund?: string }> }) {
  const [who, p, q, list] = await Promise.all([me(), purse(), searchParams, checklist()])
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  if (!p) return (
    <section className="tile notice">
      <div className="grow"><b>Care Purse isn’t open to you yet</b>
        <span>We’re opening Care Purse to people in stages. We’ll email you when yours is ready.</span></div>
    </section>
  )
  return <Wallet purse={p} name={name} openFund={q.fund === '1'} checklist={list} />
}
