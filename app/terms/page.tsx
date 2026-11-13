import { TERMS } from '@/lib/terms-text'
import { LegalDoc } from '../legal-doc'

// The Terms of Service, open to anyone: givers to a Care Fund accept §11 by
// giving. Rendered per request, so its scripts carry the page's CSP nonce.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Terms of Service · Zome' }

export default function Terms() {
  return <LegalDoc text={TERMS} />
}
