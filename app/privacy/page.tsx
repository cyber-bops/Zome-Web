import { PRIVACY } from '@/lib/privacy-text'
import { LegalDoc } from '../legal-doc'

// The Privacy Policy, open to anyone. Rendered per request, so its scripts
// carry the page's CSP nonce.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Privacy Policy · Zome' }

export default function Privacy() {
  return <LegalDoc text={PRIVACY} />
}
