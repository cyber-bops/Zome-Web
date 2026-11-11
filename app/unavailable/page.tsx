import Link from 'next/link'
import { StatusPage } from '../status-page'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Taking too long · Zome' }

// Where a page goes when the API takes too long or can't be reached
// (server/api.ts). It never calls the API itself, so it always loads.
export default async function Unavailable({ searchParams }: { searchParams: Promise<{ kind?: string; back?: string }> }) {
  const { kind, back } = await searchParams
  // Only a path on this site, never somewhere else.
  const to = back && back.startsWith('/') && !back.startsWith('//') && !back.startsWith('/unavailable') ? back : '/'
  const timeout = kind === 'timeout'
  return (
    <StatusPage code={timeout ? 'Timeout' : 'Offline'} tone="warn"
      title={timeout ? 'This is taking longer than it should' : 'Zome isn’t answering right now'}
      actions={<><Link href={to} className="btn">Try again</Link><Link href="/" className="btn outline">Go to Home</Link></>}>
      {timeout
        ? 'We waited 15 seconds for Zome and stopped. Nothing in your Care Purse was changed. Try again in a moment.'
        : 'We couldn’t reach Zome. Check your internet connection, then try again. Nothing in your Care Purse was changed.'}
    </StatusPage>
  )
}
