import { me, purse } from '@/server/api'
import { ReceiptsView } from './view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Receipts · Zome' }

export default async function Page() {
  const [who, p] = await Promise.all([me(), purse()])
  const name = who?.full_name?.trim() || who?.nickname?.trim() || ''
  return <ReceiptsView purse={p} name={name} />
}
