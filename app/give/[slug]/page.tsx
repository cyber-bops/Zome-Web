import { api, APIError } from '@/server/api'
import { ZomeMark } from '../../mark'
import { GiveForm, type GivingPage } from './form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Give to a Care Purse · Zome' }

// The giving page (ADR-0053 §6): open to anyone with the link, no account.
// It shows a first name and an initial, and nothing about anyone's health.
export default async function Give({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let page: GivingPage | null = null
  try {
    page = await api<GivingPage>(`/v1/give/${encodeURIComponent(slug.toLowerCase())}`, { token: null })
  } catch (e) {
    if (!(e instanceof APIError)) throw e
  }
  return (
    <main className="give">
      <a className="wm give-wm" href="https://myzome.app"><ZomeMark />Zome</a>
      {page ? <GiveForm slug={slug.toLowerCase()} page={page} /> : (
        <div className="tape"><div className="paper">
          <div className="ph"><ZomeMark /><b>THIS LINK ISN’T OPEN</b><span>ASK FOR A NEW ONE</span></div>
          <div className="dash" />
          <p className="give-note">The person who shared it may have turned it off or made a new one.</p>
        </div></div>
      )}
    </main>
  )
}
