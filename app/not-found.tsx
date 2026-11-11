import Link from 'next/link'
import { StatusPage } from './status-page'

export const metadata = { title: 'Not found · Zome' }

// Any address the web app doesn't have, and anything a page says isn't there.
export default function NotFound() {
  return (
    <StatusPage code="404" title="There’s nothing here"
      actions={<Link href="/" className="btn">Go to Home</Link>}>
      The page may have moved. Check the address, or start again from Home.
    </StatusPage>
  )
}
