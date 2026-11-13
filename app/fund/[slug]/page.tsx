import { api, APIError, type FundPayment, type FundUpdate } from '@/server/api'
import { naira } from '@/lib/money'
import { GiveForm } from '../../give/[slug]/form'
import { ZomeMark } from '../../mark'
import { Report } from './report'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Care Fund · Zome' }

type Page = {
  title: string; story: string; goal_kobo: number; patient_first_name?: string
  organiser_first_name: string; organiser_last_initial: string
  raised_kobo: number; paid_out_kobo: number; gifts: number; opened_at: string; ends_at: string
  taking_gifts: boolean; closed: boolean; frozen: boolean
  payments: FundPayment[]; updates: FundUpdate[]; recent: { name: string; amount_kobo: number; at: string }[]
  minimum_kobo: number; details_over_kobo: number
}
const day = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(iso))

// A Care Fund's page (ADR-0054 §7): open to anyone with the link. The
// organiser's first name and initial, the story, what was raised and where
// every naira went; never a diagnosis, a document, or a giver's note.
export default async function Fund({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = slug.toLowerCase()
  let p: Page | null = null
  try {
    p = await api<Page>(`/v1/fund/${encodeURIComponent(s)}`, { token: null })
  } catch (e) {
    if (!(e instanceof APIError)) throw e
  }
  if (!p) return (
    <main className="give">
      <a className="wm give-wm" href="https://myzome.app"><ZomeMark />Zome</a>
      <div className="tape"><div className="paper">
        <div className="ph"><ZomeMark /><b>THIS FUND ISN’T OPEN</b><span>CHECK THE LINK</span></div>
        <div className="dash" />
        <p className="give-note">Please check the link with the person who sent it.</p>
      </div></div>
    </main>
  )
  const who = `${p.organiser_first_name}${p.organiser_last_initial ? ` ${p.organiser_last_initial}.` : ''}`
  const pct = Math.min(100, Math.round((p.raised_kobo / Math.max(1, p.goal_kobo)) * 100))
  const left = Math.ceil((Date.parse(p.ends_at) - Date.now()) / 86_400_000)
  return (
    <main className="give fund-page">
      <a className="wm give-wm" href="https://myzome.app"><ZomeMark />Zome</a>
      <div className="fund-cols">
        <article className="fund-story">
          <p className="lbl">Care Fund</p>
          <h1 className="fund-h">{p.title}</h1>
          <p className="fund-by">{p.patient_first_name ? <>For <b>{p.patient_first_name}</b>, started by <b>{who}</b></> : <>For <b>{who}</b>’s own care</>} · {day(p.opened_at)}</p>
          <section className="fund-total">
            <p><b>{naira(p.raised_kobo, true)}</b> <span>raised of {naira(p.goal_kobo, true)}</span></p>
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Raised so far"><i className={`w${Math.round(pct / 5) * 5}`} /></div>
            <p className="fund-facts"><span>{p.gifts} {p.gifts === 1 ? 'gift' : 'gifts'}</span>
              <span>{naira(p.paid_out_kobo, true)} paid out</span>
              <span>{p.frozen ? 'Paused' : p.closed ? 'Closed' : left > 0 ? `${left} ${left === 1 ? 'day' : 'days'} left` : 'Ended'}</span></p>
          </section>
          {p.taking_gifts && <a className="btn wide lg fund-jump" href="#give">Give to this fund</a>}
          <section className="fund-promise">
            <b>Held for care.</b> Paid only to hospitals, clinics, pharmacies and labs. Every payment shows below.
          </section>
          <div className="fund-text">{p.story.split(/\n+/).map((para, i) => <p key={i}>{para}</p>)}</div>

          <h2 className="fund-sub">Where the money went</h2>
          {p.payments.length === 0 ? <p className="none">Nothing paid out yet. Every payment to a hospital, clinic or pharmacy will show here.</p> : (
            <ul className="fund-list">{p.payments.map((x, i) => (
              <li key={i}><span className="grow"><b>{x.provider}</b> <span className="mut">· {day(x.at)}</span></span><span className="mono">{naira(x.amount_kobo, true)}</span><span className="paid-tag">PAID</span></li>
            ))}</ul>
          )}

          {p.updates.length > 0 && <>
            <h2 className="fund-sub">Updates</h2>
            <ul className="fund-updates">{p.updates.map((u, i) => <li key={i}><span className="mut mono">{day(u.at)}</span><p>{u.body}</p></li>)}</ul>
          </>}

          {p.recent.length > 0 && <>
            <h2 className="fund-sub">Recent gifts</h2>
            <ul className="fund-list">{p.recent.map((g, i) => (
              <li key={i}><span className="grow"><b>{g.name}</b> <span className="mut">· {day(g.at)}</span></span><span className="mono in">+{naira(g.amount_kobo, true)}</span></li>
            ))}</ul>
          </>}
          <Report slug={s} />
        </article>
        <aside className="fund-give" id="give">
          {p.taking_gifts
            ? <GiveForm slug={s} fund={{ title: p.title }} page={{ first_name: p.organiser_first_name, last_initial: p.organiser_last_initial, minimum_kobo: p.minimum_kobo, details_over_kobo: p.details_over_kobo }} />
            : <div className="tape"><div className="paper">
                <div className="ph"><ZomeMark /><b>{p.frozen ? 'PAUSED' : 'NOT TAKING GIFTS'}</b><span>{p.frozen ? 'WE’RE CHECKING SOMETHING' : 'THIS FUND HAS CLOSED'}</span></div>
                <div className="dash" />
                <p className="give-note">{p.frozen ? 'We’ve paused this fund while we check something. Gifts will open again once we’re done.' : 'Thank you to everyone who gave. What was raised is still used only for care, and every payment shows on this page.'}</p>
              </div></div>}
        </aside>
      </div>
    </main>
  )
}
