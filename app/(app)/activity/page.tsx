import { purse } from '@/server/api'
import { ActivityPage } from './view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Activity · Zome' }

export default async function Page() {
  const p = await purse()
  return <ActivityPage purse={p} />
}
