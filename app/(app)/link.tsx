'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { naira } from '@/lib/money'
import type { Mandate, Purse } from '@/server/api'
import { Sheet } from './sheet'

// A linked bank account (ADR-0025), as the app has it (LinkAccountScreens):
// choose the bank and the account, confirm it's yours, make the small
// transfer that authorises the link, then wait for the bank. Once linked:
// fund in one tap, save automatically, or unlink.

type Bank = { code: string; name: string }
const words = (e: unknown) => !(e instanceof Refused) ? 'That didn’t go through. Try again.'
  : e.status === 404 ? 'Linking a bank account isn’t available right now.' : e.message
const stateWord: Record<string, string> = {
  opening: 'Waiting for your bank', awaiting_authorisation: 'Make a transfer', active: 'Linked', suspended: 'Paused by your bank',
  rejected: 'Not approved', cancelled: 'Unlinked', failed: 'Didn’t go through', expired: 'Ran out',
}
export const linkWord = (m?: Mandate) => (m ? stateWord[m.state] ?? m.state : 'Not linked')
const cadenceWord = { daily: 'Every day', weekly: 'Every week', monthly: 'Every month' } as const

function Authorise({ m, onClose }: { m: Mandate; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Sheet eyebrow="Link your bank account" title="Make a transfer" lede={m.authorisation.text} onClose={onClose}
      foot={<button type="button" className="btn span" onClick={onClose}>I’ve sent it</button>}>
      <dl className="kv">
        {m.authorisation.amount_kobo ? <div><dt>Amount</dt><dd>{naira(m.authorisation.amount_kobo)}</dd></div> : null}
        {m.authorisation.bank_name && <div><dt>Bank</dt><dd>{m.authorisation.bank_name}</dd></div>}
        {m.authorisation.account_number && <div><dt>Account</dt><dd>{m.authorisation.account_number}
          <button type="button" className="copy" onClick={() => navigator.clipboard?.writeText(m.authorisation.account_number ?? '').then(() => setCopied(true), () => {})}>{copied ? 'Copied' : 'Copy'}</button></dd></div>}
        <div><dt>From</dt><dd>{m.bank_name} ··{m.account_number.slice(-4)}</dd></div>
      </dl>
      <p className="small">Your bank is approving the link. This can take up to 3 days.</p>
    </Sheet>
  )
}

export function LinkSheet({ onClose, onDone }: { onClose: () => void; onDone: (t: string) => void }) {
  const router = useRouter()
  const [banks, setBanks] = useState<Bank[] | null>(null)
  const [find, setFind] = useState('')
  const [bank, setBank] = useState<Bank | null>(null)
  const [number, setNumber] = useState('')
  const [name, setName] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [made, setMade] = useState<Mandate | null>(null)

  useEffect(() => { call<Bank[]>('vault/banks').then(setBanks, e => { setBanks([]); setProblem(words(e)) }) }, [])
  useEffect(() => {
    setName(null)
    if (!bank || number.length !== 10) return
    let gone = false
    setLooking(true); setProblem(null)
    call<{ account_name: string }>('vault/account-lookup', 'POST', { bank_code: bank.code, account_number: number })
      .then(r => { if (!gone) setName(r.account_name) }, e => { if (!gone) setProblem(words(e)) })
      .finally(() => { if (!gone) setLooking(false) })
    return () => { gone = true }
  }, [bank, number])
  const shown = useMemo(() => (banks ?? []).filter(b => !find.trim() || b.name.toLowerCase().includes(find.trim().toLowerCase())).slice(0, 40), [banks, find])

  const link = async () => {
    if (!bank || !name) return
    setBusy(true); setProblem(null)
    try { const m = await call<Mandate>('vault/mandates', 'POST', { bank_code: bank.code, account_number: number }); setMade(m); router.refresh() }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }

  if (made) return <Authorise m={made} onClose={() => { onClose(); onDone('Your bank is approving the link') }} />
  return (
    <Sheet eyebrow="Fund in one tap" title="Link your bank account" lede="Fund your purse in one tap, and save automatically when you want to. You can unlink any time." onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={busy || !name} onClick={link}>{busy ? 'Linking…' : name ? 'Confirm it’s your account' : 'Continue'}</button></>}>
      {!bank ? (
        <>
          <label className="search"><span className="lbl">Bank</span><input id="ln-bank" value={find} onChange={e => setFind(e.target.value)} placeholder="Find your bank" autoFocus autoComplete="off" /></label>
          <div className="pick">
            {banks === null ? <p className="none">Loading banks…</p>
              : shown.length === 0 ? (banks.length ? <p className="none">No bank by that name.</p> : null)
              : shown.map(b => <button key={b.code} type="button" onClick={() => setBank(b)}><span className="pin">{b.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span><span className="grow"><b>{b.name}</b></span></button>)}
          </div>
        </>
      ) : (
        <>
          <p className="chosen"><span>{bank.name}</span><button type="button" className="link-btn" onClick={() => { setBank(null); setName(null) }}>Change</button></p>
          <label className="label top-gap" htmlFor="ln-number">Account number</label>
          <input id="ln-number" className="field mono" inputMode="numeric" autoComplete="off" maxLength={10} autoFocus value={number} placeholder="0123456789"
            onChange={e => { setProblem(null); setNumber(e.target.value.replace(/\D/g, '').slice(0, 10)) }} />
          <p className="small" role="status">{looking ? 'Finding the account…' : name ? <>Account name: <b className="found">{name}</b></> : 'Ten digits, in your own name.'}</p>
        </>
      )}
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

export function SaveSheet({ purse, onClose, onDone }: { purse: Purse; onClose: () => void; onDone: (t: string) => void }) {
  const router = useRouter()
  const now = purse.schedule
  const [typed, setTyped] = useState(now ? String(now.amount_kobo / 100) : '5000')
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'monthly'>(now?.cadence ?? 'weekly')
  const today = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(now?.next_on ?? today)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const amount = Number(typed || 0) * 100
  const limit = purse.linked_account?.limit_kobo ?? 0
  const save = async () => {
    setBusy(true); setProblem(null)
    try { await call('vault/schedule', 'PUT', { amount_kobo: amount, cadence, starts_on: start }); router.refresh(); onClose(); onDone(`Saving ${naira(amount)} ${cadenceWord[cadence].toLowerCase()}`) }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  const stop = async () => {
    setBusy(true); setProblem(null)
    try { await call('vault/schedule', 'DELETE'); router.refresh(); onClose(); onDone('Saving automatically is off') }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  return (
    <Sheet eyebrow="Save automatically" title="Choose how much and how often" lede={purse.linked_account ? `From ${purse.linked_account.bank_name} ··${purse.linked_account.account_number.slice(-4)}.` : undefined} onClose={onClose}
      foot={<>{now ? <button type="button" className="btn danger" disabled={busy} onClick={stop}>Stop saving</button> : <button type="button" className="btn soft" onClick={onClose}>Cancel</button>}
        <button type="button" className="btn" disabled={busy || !amount} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <label className="sr" htmlFor="sv-amount">Amount</label>
      <div className="amt"><span>₦</span><input id="sv-amount" inputMode="numeric" autoComplete="off" value={typed ? Number(typed).toLocaleString('en-NG') : ''} onChange={e => { setProblem(null); setTyped(e.target.value.replace(/\D/g, '').slice(0, 7)) }} /></div>
      <div className="quick">{(['daily', 'weekly', 'monthly'] as const).map(c => <button key={c} type="button" aria-pressed={cadence === c} onClick={() => setCadence(c)}>{cadenceWord[c]}</button>)}</div>
      <label className="label top-gap" htmlFor="sv-start">Starting</label>
      <input id="sv-start" className="field mono" type="date" min={today} value={start} onChange={e => setStart(e.target.value)} />
      {limit > 0 && <p className="small">Up to {naira(limit)} each time, the limit your bank approved.</p>}
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

/** One tap: debit the linked account now, with the fee shown first. */
export function OneTap({ m, amount, onDone }: { m: Mandate; amount: number; onDone: (t: string) => void }) {
  const router = useRouter()
  const [quote, setQuote] = useState<{ fee_kobo: number; total_kobo: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const key = useRef<{ for: number; key: string } | null>(null)
  useEffect(() => {
    setQuote(null)
    if (amount < 10000) return
    const t = setTimeout(() => call<{ fee_kobo: number; total_kobo: number }>('vault/debits/quote', 'POST', { amount_kobo: amount }).then(setQuote, e => setProblem(words(e))), 250)
    return () => clearTimeout(t)
  }, [amount])
  const go = async () => {
    if (!key.current || key.current.for !== amount) key.current = { for: amount, key: `web-${crypto.randomUUID()}` }
    setBusy(true); setProblem(null)
    try { await call('vault/debits', 'POST', { amount_kobo: amount }, { 'Idempotency-Key': key.current.key }); router.refresh(); onDone(`${naira(amount)} on its way from ${m.bank_name}`) }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  return (
    <div className="onetap">
      <button type="button" className="btn wide" disabled={busy || amount < 10000} onClick={go}>
        {busy ? 'Funding…' : `Fund purse now from ${m.bank_name} ··${m.account_number.slice(-4)}`}
      </button>
      {quote && <p className="small">{naira(quote.fee_kobo)} fee · {naira(quote.total_kobo)} from your bank</p>}
      {problem && <p className="err" role="alert">{problem}</p>}
    </div>
  )
}

/** The bank-account card on You: its state and what can be done. */
export function BankCard({ purse }: { purse: Purse | null }) {
  const router = useRouter()
  const [open, setOpen] = useState<null | 'link' | 'save' | 'auth' | 'unlink'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2600) }
  if (!purse) return null
  const m = purse.linked_account
  const live = m && ['opening', 'awaiting_authorisation', 'active', 'suspended'].includes(m.state)
  const unlink = async () => {
    setBusy(true)
    try { await call('vault/mandates/current', 'DELETE'); router.refresh(); setOpen(null); say('Unlinked') } catch (e) { say(words(e)) } finally { setBusy(false) }
  }
  return (
    <section className="sheet-paper">
      <p className="lbl">Bank account</p>
      {live && m ? (
        <>
          <div className="row"><span><b className="b">{m.bank_name} ··{m.account_number.slice(-4)}</b><span className="mut"> {m.account_name}</span></span><span className="lbl">{linkWord(m)}</span></div>
          {m.state === 'awaiting_authorisation' && <div className="row"><span>Your bank needs a small transfer to approve the link.</span><button type="button" className="btn small-btn" onClick={() => setOpen('auth')}>See how</button></div>}
          {m.state === 'active' && <div className="row"><span>{purse.schedule ? `Saving ${naira(purse.schedule.amount_kobo)} ${cadenceWord[purse.schedule.cadence].toLowerCase()}` : 'Save automatically'}</span><button type="button" className="btn small-btn" onClick={() => setOpen('save')}>{purse.schedule ? 'Change' : 'Set up'}</button></div>}
          <div className="row"><span>Unlink account</span><button type="button" className="btn danger small-btn" onClick={() => setOpen('unlink')}>Unlink</button></div>
        </>
      ) : (
        <div className="row"><span>Fund in one tap, and save automatically.</span><button type="button" className="btn small-btn" onClick={() => setOpen('link')}>Link</button></div>
      )}
      {open === 'link' && <LinkSheet onClose={() => setOpen(null)} onDone={say} />}
      {open === 'save' && <SaveSheet purse={purse} onClose={() => setOpen(null)} onDone={say} />}
      {open === 'auth' && m && <Authorise m={m} onClose={() => setOpen(null)} />}
      {open === 'unlink' && (
        <Sheet eyebrow="Bank account" title="Unlink account" lede="Care Purse won’t be able to take money from it. Your balance stays as it is." onClose={() => setOpen(null)}
          foot={<><button type="button" className="btn soft" onClick={() => setOpen(null)}>Cancel</button><button type="button" className="btn danger" disabled={busy} onClick={unlink}>{busy ? 'Unlinking…' : 'Unlink'}</button></>} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  )
}
