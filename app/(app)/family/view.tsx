'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { GiftLink, Movement, MyCareFund } from '@/server/api'
import { CareFundPanel } from './carefund'
import { HeartIcon, LinkIcon, MoreIcon, ShareIcon } from '../../icons'
import { Sheet } from '../sheet'

// Family (ADR-0053 §6): the link that lets family give to the purse, and
// what they gave. Gifts are for care only, and spent before Care Purse.
const words = (e: unknown) => !(e instanceof Refused) ? 'That didn’t work this time. Please try again.'
  : e.status === 404 ? 'The family link isn’t available right now.' : e.message
const day = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(iso))

export type CareFundMode = 'family' | 'public'

// Care Fund, two setups (owner, 13 November 2026): Family, the private link
// whose gifts land in Care Purse; Public, the health fundraiser with its own
// page, held for care and paid only to providers (ADR-0054).
export function FamilyView({ link, origin, first, gifts, open, fund, mode }: { link: GiftLink | null; origin: string; first: string; gifts: Movement[]; open: boolean; fund: MyCareFund | null; mode: CareFundMode }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [ask, setAsk] = useState<null | 'more' | 'replace' | 'off'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3200) }
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

  const short = url.replace(/^https?:\/\//, '')
  const shareLink = () => {
    if (navigator.share) navigator.share({ text: share }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(share)}`, '_blank', 'noreferrer')
  }

  return (
    <div className="cf">
      <h1 className="page-h">Care Fund</h1>
      <div className="segmented" role="tablist" aria-label="Care Fund">
        <Link href="/care-fund?mode=family" role="tab" aria-selected={mode === 'family'} scroll={false}>Family</Link>
        <Link href="/care-fund?mode=public" role="tab" aria-selected={mode === 'public'} scroll={false}>Public</Link>
      </div>

      {mode === 'public' ? (open && fund ? <CareFundPanel data={fund} origin={origin} onSay={say} /> : <div className="cf-empty"><b>Care Fund isn’t ready for you yet. We’ll let you know when it is.</b></div>)
      : !open ? <div className="cf-empty"><b>Care Purse isn’t open to you yet</b></div>
      : !link ? (
        <div className="cf-empty">
          <span className="badge a"><HeartIcon /></span>
          <b>Let family add to your care</b>
          <p>A private link. What they give goes into your Care Purse, for care.</p>
          <button type="button" className="btn lg" disabled={busy} onClick={() => act('make')}>{busy ? 'Creating…' : 'Create family link'}</button>
        </div>
      ) : (
        <>
          <div className="cf-hero">
            <span className="lbl">From family</span>
            <p className="cf-big">{naira(given, true)}</p>
            <p className="under">{gifts.length} {gifts.length === 1 ? 'gift' : 'gifts'} · spent first, on care</p>
          </div>
          <div className="cf-link">
            <span className="badge"><LinkIcon /></span>
            <button type="button" className="grow" onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); say('Link copied') }, () => {})}>
              <b>{copied ? 'Copied' : short}</b><span>Tap to copy</span>
            </button>
            <button type="button" className="icon-btn primary" onClick={shareLink} aria-label="Share"><ShareIcon /></button>
            <button type="button" className="icon-btn" onClick={() => setAsk('more')} aria-label="More"><MoreIcon /></button>
          </div>
          <div>
            <p className="sec-h">Gifts</p>
            {gifts.length === 0 ? <p className="none">No gifts yet. When family give, you’ll see it here.</p> : (
              <div className="cf-list">
                {gifts.map((m, i) => {
                  const who = m.from && m.from !== 'Anonymous' ? m.from : 'Anonymous'
                  return <div key={i} className="cf-row"><span className="badge g">{who === 'Anonymous' ? '?' : who[0].toUpperCase()}</span><span className="grow"><b>{who}</b><span>{day(m.at)}</span></span><span className="amt-in">+{naira(m.amount_kobo, true)}</span></div>
                })}
              </div>
            )}
          </div>
        </>
      )}
      {problem && <p className="err" role="alert">{problem}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
      {ask === 'more' && (
        <Sheet eyebrow="Family link" title="More" onClose={() => setAsk(null)}>
          <div className="menu">
            <a href={url} target="_blank" rel="noreferrer">See what they see</a>
            <button type="button" onClick={() => setAsk('replace')}>Make a new link</button>
            <button type="button" className="danger" onClick={() => setAsk('off')}>Turn off the link</button>
          </div>
        </Sheet>
      )}
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
