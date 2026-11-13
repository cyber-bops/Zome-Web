'use client'

import { useRouter } from 'next/navigation'
import { LinkIcon, MoreIcon, PayIcon, ShareIcon, ShieldIcon } from '../../icons'
import { Amount } from '../../amount'
import { useState } from 'react'
import Link from 'next/link'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { MyCareFund } from '@/server/api'
import { PaySheet } from '../pay'
import { Sheet } from '../sheet'

// Care Fund (ADR-0054), the organiser's side: start one, share it, pay a
// provider from it, post updates, extend or close it. The money is held for
// care: it leaves only as a payment to a business in the network.
const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t go through. Try again.'
const day = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(iso))
type Open = null | 'start' | 'pay' | 'update' | 'edit' | 'extend' | 'close' | 'more'

export function CareFundPanel({ data, origin, onSay }: { data: MyCareFund; origin: string; onSay: (t: string) => void }) {
  const router = useRouter()
  const [open, setOpen] = useState<Open>(null)
  const [copied, setCopied] = useState(false)
  const f = data.fund
  const close = () => setOpen(null)

  if (!f) return (
    <div className="cf-empty">
      <span className="badge b"><ShieldIcon /></span>
      <b>Raise money for a hospital bill</b>
      <p>A public page with your story and a goal. Paid only to hospitals, clinics, pharmacies and labs.</p>
      {data.may_start
        ? <button type="button" className="btn lg" onClick={() => setOpen('start')}>Start a fundraiser</button>
        : <p className="small">First finish setting up: BVN, NIN, selfie, phone and next of kin. <Link href="/profile" className="link-btn">Go to You</Link></p>}
      {open === 'start' && <StartSheet onClose={close} onDone={t => { close(); onSay(t); router.refresh() }} />}
    </div>
  )

  const url = `${origin}/fund/${f.slug}`
  const pct = Math.min(100, Math.round((f.raised_kobo / Math.max(1, f.goal_kobo)) * 100))
  const left = Math.ceil((Date.parse(f.ends_at) - Date.now()) / 86_400_000)
  const share = `I’ve started a Care Fund on Zome: ${f.title}. Everything given is paid only to the hospital, clinic or pharmacy, and every payment shows on the page: ${url}`
  const status = f.frozen ? 'Paused by Zome' : f.closed_at ? 'Closed to gifts' : left > 0 ? `${left} ${left === 1 ? 'day' : 'days'} left` : 'Ended'
  const shareLink = () => {
    if (navigator.share) navigator.share({ text: share }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(share)}`, '_blank', 'noreferrer')
  }
  type Line = { who: string; at: string; kobo: number; out: boolean; note?: string }
  const activity: Line[] = [
    ...(data.gifts ?? []).map(g => ({ who: g.name, at: g.at, kobo: g.amount_kobo, out: false, note: g.note })),
    ...(data.payments ?? []).map(p => ({ who: p.provider, at: p.at, kobo: p.amount_kobo, out: true })),
  ].sort((x, y) => Date.parse(y.at) - Date.parse(x.at))

  return (
    <>
      <div className="cf-hero">
        <span className="lbl">{status}</span>
        <p className="cf-title">{f.title}</p>
        <p className="cf-big">{naira(f.raised_kobo, true)} <span>of {naira(f.goal_kobo, true)}</span></p>
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Raised"><i className={`w${Math.round(pct / 5) * 5}`} /></div>
      </div>
      <button type="button" className="btn lg wide" disabled={f.frozen || f.balance_kobo === 0} onClick={() => setOpen('pay')}>Pay a provider</button>
      <div className="tiles">
        <div className="tile"><span className="ic b"><ShieldIcon /></span><span className="t">Held for care</span><span className="num">{naira(f.balance_kobo, true)}</span></div>
        <div className="tile"><span className="ic ink"><PayIcon /></span><span className="t">Paid out</span><span className="num">{naira(f.paid_out_kobo, true)}</span></div>
      </div>
      <div className="cf-link">
        <span className="badge"><LinkIcon /></span>
        <button type="button" className="grow" onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); onSay('Link copied') }, () => {})}>
          <b>{copied ? 'Copied' : url.replace(/^https?:\/\//, '')}</b><span>Tap to copy</span>
        </button>
        {!f.closed_at && <button type="button" className="icon-btn primary" onClick={shareLink} aria-label="Share"><ShareIcon /></button>}
        <button type="button" className="icon-btn" onClick={() => setOpen('more')} aria-label="More"><MoreIcon /></button>
      </div>
      <div>
        <p className="sec-h">Activity</p>
        {activity.length === 0 ? <p className="none">No gifts yet.</p> : (
          <div className="cf-list">
            {activity.map((x, i) => (
              <div key={i} className="cf-row">
                <span className={`badge ${x.out ? 'ink' : 'g'}`}>{x.out ? <PayIcon /> : x.who[0]?.toUpperCase() ?? '?'}</span>
                <span className="grow"><b>{x.who}</b><span>{x.out ? 'Paid' : x.note ? `“${x.note}”` : 'Gift'} · {day(x.at)}</span></span>
                <span className={x.out ? 'amt-out' : 'amt-in'}>{x.out ? '−' : '+'}{naira(x.kobo, true)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {open === 'more' && (
        <Sheet eyebrow="Care Fund" title="More" onClose={close}>
          <div className="menu">
            <a href={url} target="_blank" rel="noreferrer">See the page</a>
            <button type="button" disabled={f.frozen} onClick={() => setOpen('update')}>Post an update</button>
            {!f.closed_at && <button type="button" onClick={() => setOpen('edit')}>Edit the goal or story</button>}
            {!f.closed_at && !f.extended && <button type="button" onClick={() => setOpen('extend')}>Keep it open 30 more days</button>}
            {!f.closed_at && <button type="button" className="danger" onClick={() => setOpen('close')}>Stop taking gifts</button>}
          </div>
        </Sheet>
      )}
      {open === 'pay' && <PaySheet balance={f.balance_kobo} fund={{ id: f.id, title: f.title }} onClose={close} onPaid={t => onSay(t)} />}
      {open === 'update' && <UpdateSheet id={f.id} onClose={close} onDone={() => { close(); onSay('Update posted'); router.refresh() }} />}
      {open === 'edit' && <EditSheet id={f.id} title={f.title} story={f.story} goal={f.goal_kobo} onClose={close} onDone={() => { close(); onSay('Saved'); router.refresh() }} />}
      {open === 'extend' && <Confirm title="Keep it open longer?" lede="It stays open for another 30 days. A fund can be extended once." go="Extend" path={`me/care-fund/${f.id}/extend`} onClose={close} onDone={() => { close(); onSay('Extended'); router.refresh() }} />}
      {open === 'close' && <Confirm danger title="Stop taking gifts?" lede="The page stays up, and what was raised stays held for care: you can still pay providers from it. This can’t be undone." go="Close to gifts" path={`me/care-fund/${f.id}/close`} onClose={close} onDone={() => { close(); onSay('Closed to gifts'); router.refresh() }} />}
    </>
  )
}

function StartSheet({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const [title, setTitle] = useState('')
  const [story, setStory] = useState('')
  const [goal, setGoal] = useState('')
  // Who it's for is required (owner, 12 November 2026).
  const [forWho, setForWho] = useState<'' | 'me' | 'other'>('')
  const [patient, setPatient] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const goalKobo = Number(goal || 0) * 100
  const ready = title.trim().length >= 3 && story.trim().length >= 20 && goalKobo >= 10_000
    && (forWho === 'me' || (forWho === 'other' && patient.trim().length > 0 && agreed))
  return (
    <Sheet eyebrow="Care Fund" title="Start a Care Fund" onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={!ready || busy} onClick={async () => {
          setBusy(true); setProblem(null)
          try { await call('me/care-fund', 'POST', { title, story, goal_kobo: goalKobo, for_self: forWho === 'me', patient_first_name: forWho === 'other' ? patient : '' }); onDone('Your Care Fund is open') }
          catch (e) { setProblem(words(e)) } finally { setBusy(false) }
        }}>{busy ? 'Starting…' : 'Start the fund'}</button></>}>
      <label className="label" htmlFor="cf-title">What it’s for</label>
      <input id="cf-title" className="field" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="Mum’s surgery at Lagoon Hospital" autoFocus />
      <label className="label top-gap" htmlFor="cf-goal">Goal</label>
      <Amount id="cf-goal" digits={goal} onDigits={setGoal} label="Goal" />
      <label className="label top-gap" htmlFor="cf-story">The story</label>
      <textarea id="cf-story" className="field" rows={5} maxLength={2000} value={story} onChange={e => setStory(e.target.value)}
        placeholder="Who it’s for, what care they need, and what the money will pay." />
      <p className="small">Keep medical details private: givers see the story, never a diagnosis or a document.</p>
      <p className="label top-gap">Who it’s for</p>
      <div className="ways" role="radiogroup" aria-label="Who it’s for">
        <button type="button" role="radio" aria-checked={forWho === 'me'} className="way" onClick={() => setForWho('me')}><i aria-hidden="true" /><span className="grow"><b>Me</b><span>My own care</span></span></button>
        <button type="button" role="radio" aria-checked={forWho === 'other'} className="way" onClick={() => setForWho('other')}><i aria-hidden="true" /><span className="grow"><b>Someone else</b><span>A parent, child, relative or friend</span></span></button>
      </div>
      {forWho === 'other' && <>
        <label className="label top-gap" htmlFor="cf-patient">Their first name</label>
        <input id="cf-patient" className="field" maxLength={40} value={patient} onChange={e => setPatient(e.target.value)} placeholder="Ngozi" />
        <label className="check"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /> {patient.trim() || 'They'} agreed to be named on the page</label>
      </>}
      <p className="small">Open for 30 days. Givers pay the bank’s fee on top, so the fund gets every naira they give.</p>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

function UpdateSheet({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <Sheet eyebrow="Care Fund" title="Post an update" lede="Givers see it on the fund’s page." onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={!body.trim() || busy} onClick={async () => {
          setBusy(true); setProblem(null)
          try { await call(`me/care-fund/${id}/updates`, 'POST', { body }); onDone() } catch (e) { setProblem(words(e)) } finally { setBusy(false) }
        }}>{busy ? 'Posting…' : 'Post'}</button></>}>
      <textarea className="field" rows={4} maxLength={1000} value={body} onChange={e => setBody(e.target.value)} autoFocus placeholder="The surgery went well. Thank you, everyone." aria-label="Update" />
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

function EditSheet({ id, title, story, goal, onClose, onDone }: { id: string; title: string; story: string; goal: number; onClose: () => void; onDone: () => void }) {
  const [t, setT] = useState(title)
  const [s, setS] = useState(story)
  const [g, setG] = useState(String(goal / 100))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <Sheet eyebrow="Care Fund" title="Edit the fund" onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={busy} onClick={async () => {
          setBusy(true); setProblem(null)
          try { await call(`me/care-fund/${id}`, 'PATCH', { title: t, story: s, goal_kobo: Number(g || 0) * 100 }); onDone() } catch (e) { setProblem(words(e)) } finally { setBusy(false) }
        }}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <label className="label" htmlFor="ce-title">What it’s for</label>
      <input id="ce-title" className="field" maxLength={80} value={t} onChange={e => setT(e.target.value)} />
      <label className="label top-gap" htmlFor="ce-goal">Goal</label>
      <Amount id="ce-goal" digits={g} onDigits={setG} label="Goal" />
      <label className="label top-gap" htmlFor="ce-story">The story</label>
      <textarea id="ce-story" className="field" rows={6} maxLength={2000} value={s} onChange={e => setS(e.target.value)} />
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

function Confirm({ title, lede, go, path, danger, onClose, onDone }: { title: string; lede: string; go: string; path: string; danger?: boolean; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <Sheet eyebrow="Care Fund" title={title} lede={problem ?? lede} onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button>
        <button type="button" className={`btn${danger ? ' danger' : ''}`} disabled={busy} onClick={async () => {
          setBusy(true); setProblem(null)
          try { await call(path, 'POST', {}); onDone() } catch (e) { setProblem(words(e)) } finally { setBusy(false) }
        }}>{busy ? 'One moment…' : go}</button></>} />
  )
}
