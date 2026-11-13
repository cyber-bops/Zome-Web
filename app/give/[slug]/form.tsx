'use client'

import { useRef, useState } from 'react'
import { Amount } from '../../amount'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import { ZomeMark } from '../../mark'

export type GivingPage = { first_name: string; last_initial: string; minimum_kobo: number; details_over_kobo: number }
type Opened = { amount_kobo: number; fee_kobo: number; total_kobo: number; bank_name: string; account_number: string; account_name: string; expires_at: string }
const QUICK = [2000, 5000, 10000, 20000]
const words = (e: unknown) => e instanceof Refused ? e.message : 'That didn’t work this time. Please try again.'
const lagos = (iso: string) => new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(iso))

// The gift, written on a receipt: how much, from whom, a note, where the
// receipt goes; then the one-time account to transfer to.
/** `fund`: the gift goes to a Care Fund (ADR-0054) at /v1/fund/{slug}, not a Care Purse. */
export function GiveForm({ slug, page, fund }: { slug: string; page: GivingPage; fund?: { title: string } }) {
  const who = `${page.first_name}${page.last_initial ? ` ${page.last_initial}.` : ''}`
  const path = fund ? `fund/${slug}` : `give/${slug}`
  const [typed, setTyped] = useState('')
  const [name, setName] = useState('')
  const [shy, setShy] = useState(false)
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [opened, setOpened] = useState<Opened | null>(null)
  const [copied, setCopied] = useState(false)
  const key = useRef<{ for: string; key: string } | null>(null)
  const amount = Number(typed || 0) * 100
  const big = page.details_over_kobo > 0 && amount >= page.details_over_kobo

  const give = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount < page.minimum_kobo) { setProblem(`Give at least ${naira(page.minimum_kobo, true)}.`); return }
    const id = `${amount}:${email}`
    if (!key.current || key.current.for !== id) key.current = { for: id, key: `web-${crypto.randomUUID()}` }
    setBusy(true); setProblem(null)
    try {
      setOpened(await call<Opened>(path, 'POST', { amount_kobo: amount, name, anonymous: shy, note, email, full_name: big ? fullName : '', phone: big ? phone : '' }, { 'Idempotency-Key': key.current.key }))
    } catch (err) { setProblem(words(err)) } finally { setBusy(false) }
  }

  if (opened) return (
    <div className="tape"><div className="paper">
      <div className="ph"><ZomeMark /><b>SEND YOUR GIFT</b><span>{fund ? fund.title.toUpperCase() : `FOR ${who.toUpperCase()}’S CARE`}</span></div>
      <div className="dash" />
      <p className="give-big"><span className="lbl">Send exactly</span><b>{naira(opened.total_kobo)}</b></p>
      <dl className="kv">
        <div><dt>Bank</dt><dd>{opened.bank_name}</dd></div>
        <div><dt>Account</dt><dd>{opened.account_number}
          <button type="button" className="copy" onClick={() => navigator.clipboard?.writeText(opened.account_number).then(() => setCopied(true), () => {})}>{copied ? 'Copied' : 'Copy'}</button></dd></div>
        <div><dt>Name</dt><dd>{opened.account_name}</dd></div>
        {opened.fee_kobo > 0 && <div><dt>Includes bank fee</dt><dd>{naira(opened.fee_kobo)}</dd></div>}
      </dl>
      <p className="give-note">From any bank app, one transfer, until {lagos(opened.expires_at)}. {fund ? 'It shows on the fund’s page as soon as it arrives.' : `${who} sees it as soon as it arrives.`}</p>
      <div className="bars" aria-hidden="true" />
      <p className="pf">FOR CARE ONLY · ZOME</p>
    </div></div>
  )

  return (
    <form className="tape" onSubmit={give}><div className="paper">
      <div className="ph"><ZomeMark /><b>{fund ? 'GIVE TO THIS FUND' : `A GIFT FOR ${who.toUpperCase()}`}</b><span>{fund ? 'HELD FOR CARE' : 'TO THEIR CARE PURSE'}</span></div>
      <div className="dash" />
      <Amount id="g-amount" digits={typed} onDigits={d => { setProblem(null); setTyped(d) }} max={9_999_999} />
      <div className="quick">{QUICK.map(n => <button key={n} type="button" aria-pressed={amount === n * 100} onClick={() => setTyped(String(n))}>₦{n.toLocaleString('en-NG')}</button>)}</div>
      <div className="give-fields">
        <label className="label" htmlFor="g-name">Your name</label>
        <input id="g-name" className="field" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={80} />
        <label className="check"><input type="checkbox" checked={shy} onChange={e => setShy(e.target.checked)} /> Show me to {page.first_name} as “Anonymous”</label>
        <label className="label" htmlFor="g-note">A note (optional)</label>
        <input id="g-note" className="field" value={note} onChange={e => setNote(e.target.value)} maxLength={140} placeholder="Get well soon" />
        <label className="label" htmlFor="g-email">Email, for your receipt</label>
        <input id="g-email" className="field" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        {big && (
          <>
            <p className="give-note">For a gift of {naira(page.details_over_kobo, true)} or more, we ask for your full name and phone. Only Zome sees them.</p>
            <label className="label" htmlFor="g-full">Full name</label>
            <input id="g-full" className="field" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            <label className="label" htmlFor="g-phone">Phone</label>
            <input id="g-phone" className="field mono" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
          </>
        )}
      </div>
      <div className="dash" />
      {fund ? <>
        <p className="give-note"><b>Held for care. Paid directly to verified hospitals, clinics and pharmacies.</b> Gifts are collected by licensed payment partners and paid only to verified medical providers, never to personal bank accounts.</p>
        <p className="give-note">A single transfer of ₦5,000,000 or more is checked by the bank first, so it can take a little longer to show.</p>
        <p className="give-note">By giving, you agree to the <a href="/terms#11" target="_blank" rel="noopener">Care Fund terms</a>.</p>
      </> : <p className="give-note">{`This money is for ${page.first_name}’s care: clinics, pharmacies and labs. It can’t be taken out as cash.`}</p>}
      {problem && <p className="err" role="alert">{problem}</p>}
      <button type="submit" className="btn wide lg give-go" disabled={busy || !amount || !name.trim() || !email.includes('@')}>{busy ? 'Setting up…' : amount ? `Give ${naira(amount, true)}` : 'Give'}</button>
      <div className="bars" aria-hidden="true" />
    </div></form>
  )
}
