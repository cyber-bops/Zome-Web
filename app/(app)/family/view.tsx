'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { GiftLink, Movement } from '@/server/api'
import { Sheet } from '../sheet'

// Family (ADR-0053 §6): the link that lets family give to the purse, and
// what they gave. Gifts are for care only, and spent before Care Purse.
const words = (e: unknown) => !(e instanceof Refused) ? 'That didn’t go through. Try again.'
  : e.status === 404 ? 'The family link isn’t available right now.' : e.message
const day = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(iso))

export function FamilyView({ link, origin, first, gifts, open }: { link: GiftLink | null; origin: string; first: string; gifts: Movement[]; open: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [ask, setAsk] = useState<null | 'replace' | 'off'>(null)
  const url = link ? `${origin}/give/${link.slug}` : ''
  const given = gifts.reduce((a, m) => a + m.amount_kobo, 0)
  const share = `I’m keeping a Care Purse on Zome for my health. If you’d like to help, you can add to it here (it can only be spent on care): ${url}`

  const act = async (what: 'make' | 'off') => {
    setBusy(true); setProblem(null)
    try {
      if (what === 'make') await call('me/gift-link', 'POST', {}); else await call('me/gift-link', 'DELETE')
      setAsk(null); setCopied(false); router.refresh()
    } catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }

  return (
    <div className="view">
      <div>
        <p className="lbl">Family</p>
        <h1 className="page-h">Let family add to your care.</h1>
        <p className="page-s">Anyone with your link can give by bank transfer, without a Zome account. Gifts can only be spent on care, and are spent before your own money.</p>
        {!open ? <div className="card"><h2>Care Purse isn’t open to you yet</h2></div> : link ? (
          <section className="envelope">
            <p className="lbl">Your link</p>
            <div className="url"><span className="mono">{url.replace(/^https?:\/\//, '')}</span>
              <button type="button" className="copy" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true), () => setProblem(url))}>{copied ? 'Copied' : 'Copy'}</button></div>
            <div className="env-acts">
              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
              <a className="btn soft" href={url} target="_blank" rel="noreferrer">See what they see</a>
            </div>
            <p className="small">Givers see “{first || 'Your name'}” and your surname’s initial, never anything about your health.</p>
            <div className="row"><span>Make a new link</span><button type="button" className="btn soft small-btn" onClick={() => setAsk('replace')}>New link</button></div>
            <div className="row"><span>Turn it off</span><button type="button" className="btn danger small-btn" onClick={() => setAsk('off')}>Turn off</button></div>
          </section>
        ) : (
          <section className="envelope">
            <p className="lbl">No link yet</p>
            <p className="env-lede">Make a link to share with family and friends.</p>
            <button type="button" className="btn" disabled={busy} onClick={() => act('make')}>{busy ? 'Making…' : 'Make my link'}</button>
          </section>
        )}
        {problem && <p className="err" role="alert">{problem}</p>}
      </div>
      <div>
        <section className="sheet-paper">
          <p className="lbl">Gifts · {naira(given)} in all</p>
          {gifts.length === 0 ? <p className="none">No gifts yet. They show here as they arrive.</p> : gifts.map((m, i) => (
            <div key={i} className="step done"><span className="grow"><b>{m.from && m.from !== 'Anonymous' ? m.from : 'Anonymous'}</b> <span className="mut">· {day(m.at)}</span></span><span className="mono in">+{naira(m.amount_kobo)}</span></div>
          ))}
        </section>
      </div>
      {ask === 'replace' && (
        <Sheet eyebrow="Family link" title="Make a new link?" lede="Your old link stops working at once. Anyone who has it will see that it’s closed." onClose={() => setAsk(null)}
          foot={<><button type="button" className="btn soft" onClick={() => setAsk(null)}>Cancel</button><button type="button" className="btn" disabled={busy} onClick={() => act('make')}>{busy ? 'Making…' : 'Make a new link'}</button></>} />
      )}
      {ask === 'off' && (
        <Sheet eyebrow="Family link" title="Turn off your link?" lede="No one can give through it, and it shows nothing about you. You can make a new one any time." onClose={() => setAsk(null)}
          foot={<><button type="button" className="btn soft" onClick={() => setAsk(null)}>Cancel</button><button type="button" className="btn danger" disabled={busy} onClick={() => act('off')}>{busy ? 'Turning off…' : 'Turn off'}</button></>} />
      )}
    </div>
  )
}
