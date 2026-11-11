'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { BvnSheet } from './bvn'
import { Sheet } from './sheet'

// The set-up steps the web can do, in the app's words (IdentityScenes,
// ProfileChecklistView), through the app's own routes: /v1/me/nin,
// /v1/me/selfie, /v1/me/phone/code and /confirm, /v1/me/next-of-kin.

export const onTheWeb = new Set(['bvn', 'nin', 'selfie', 'phone', 'next_of_kin'])
const words = (e: unknown) => !(e instanceof Refused) ? 'That didn’t go through. Try again.'
  : e.status === 404 ? 'This isn’t available right now. Try again later.' : e.message

type Done = (t: string) => void

function Digits({ id, value, set, length, onEnter }: { id: string; value: string; set: (v: string) => void; length: number; onEnter: () => void }) {
  return (
    <div className="code-boxes">
      <input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={length} value={value} autoFocus
        onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, length))} onKeyDown={e => { if (e.key === 'Enter') onEnter() }} />
      {Array.from({ length }, (_, i) => <span key={i} aria-hidden="true" className={`box${i === value.length ? ' next' : ''}`}>{value[i] ?? ''}</span>)}
    </div>
  )
}

function NinSheet({ onClose, onDone }: { onClose: () => void; onDone: Done }) {
  const router = useRouter()
  const [nin, setNin] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const go = async () => {
    if (nin.length !== 11) { setProblem('Enter all 11 digits.'); return }
    setBusy(true); setProblem(null)
    try { await call('me/nin', 'POST', { nin }); router.refresh(); onClose(); onDone('NIN added') }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  return (
    <Sheet eyebrow="Set up" title="Add your NIN" lede="It’s on your NIN slip or the NIMC app. Can’t find it? Dial *346#." onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={busy || nin.length !== 11} onClick={go}>{busy ? 'Checking…' : 'Continue'}</button></>}>
      <label className="label" htmlFor="nin">National Identification Number</label>
      <input id="nin" className="field mono big-digits" inputMode="numeric" autoComplete="off" maxLength={11} autoFocus placeholder="12345678901" value={nin}
        onChange={e => { setProblem(null); setNin(e.target.value.replace(/\D/g, '').slice(0, 11)) }} onKeyDown={e => { if (e.key === 'Enter') go() }} />
      <p className="small">{nin.length} of 11 digits</p>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

function PhoneSheet({ onClose, onDone }: { onClose: () => void; onDone: Done }) {
  const router = useRouter()
  const [step, setStep] = useState<'number' | 'code'>('number')
  const [phone, setPhone] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const send = async (channel: 'sms' | 'whatsapp') => {
    setBusy(true); setProblem(null)
    try { const r = await call<{ phone: string }>('me/phone/code', 'POST', { phone, channel }); setSentTo(r.phone); setCode(''); setStep('code') }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  const confirm = async () => {
    if (code.length !== 6) return
    setBusy(true); setProblem(null)
    try { await call('me/phone/confirm', 'POST', { code }); router.refresh(); onClose(); onDone('Phone number confirmed') }
    catch (e) { setProblem(words(e)); setCode('') } finally { setBusy(false) }
  }
  if (step === 'code') return (
    <Sheet eyebrow="Phone number" title="Enter the code" lede={`We sent it to ${sentTo}.`} onClose={onClose}
      foot={<><button type="button" className="btn soft" disabled={busy} onClick={() => { setProblem(null); setStep('number') }}>Didn’t get it?</button><button type="button" className="btn" disabled={busy || code.length !== 6} onClick={confirm}>{busy ? 'Checking…' : 'Continue'}</button></>}>
      <label className="sr" htmlFor="phone-code">Code</label>
      <Digits id="phone-code" value={code} set={v => { setProblem(null); setCode(v) }} length={6} onEnter={confirm} />
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
  return (
    <Sheet eyebrow="Set up" title="What’s your number?" lede="We’ll send you a quick code to make sure it’s yours." onClose={onClose}
      foot={<><button type="button" className="btn soft" disabled={busy || phone.replace(/\D/g, '').length < 10} onClick={() => send('whatsapp')}>Send by WhatsApp</button><button type="button" className="btn" disabled={busy || phone.replace(/\D/g, '').length < 10} onClick={() => send('sms')}>{busy ? 'Sending…' : 'Send by SMS'}</button></>}>
      <label className="label" htmlFor="phone">Phone number</label>
      <input id="phone" className="field mono" type="tel" inputMode="tel" autoComplete="tel" autoFocus placeholder="0803 123 4567" value={phone}
        onChange={e => { setProblem(null); setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16)) }} />
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

/** The photo at 720 pixels on its longer side, as JPEG, as the app sends it. */
async function jpeg720(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height, 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

function SelfieSheet({ onClose, onDone }: { onClose: () => void; onDone: Done }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const pick = async (f?: File) => {
    if (!f) return
    setProblem(null)
    try { setPhoto(await jpeg720(f)) } catch { setProblem('That photo couldn’t be read. Try another.') }
  }
  const send = async () => {
    if (!photo) return
    setBusy(true); setProblem(null)
    try { await call('me/selfie', 'POST', { image: photo.split(',')[1] }); router.refresh(); onClose(); onDone('Selfie matched') }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  return (
    <Sheet eyebrow="Set up" title="Take a selfie" lede="We’ll match it to the photo on your BVN. Face the camera in good light, on your own." onClose={onClose}
      foot={photo
        ? <><button type="button" className="btn soft" disabled={busy} onClick={() => input.current?.click()}>Try again</button><button type="button" className="btn" disabled={busy} onClick={send}>{busy ? 'Checking…' : 'Continue'}</button></>
        : <button type="button" className="btn span" onClick={() => input.current?.click()}>Open camera</button>}>
      <input ref={input} id="selfie" className="sr" type="file" accept="image/*" capture="user" onChange={e => pick(e.target.files?.[0])} />
      {photo ? <img className="selfie" src={photo} alt="Your selfie" /> : <div className="selfie empty" aria-hidden="true" />}
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

function KinSheet({ onClose, onDone }: { onClose: () => void; onDone: Done }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [rel, setRel] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  useEffect(() => {
    call<{ full_name: string; relationship: string; phone: string }>('me/next-of-kin')
      .then(k => { setName(k.full_name); setRel(k.relationship); setPhone(k.phone) }, () => {})
  }, [])
  const ready = name.trim() && rel.trim() && phone.replace(/\D/g, '').length >= 10
  const save = async () => {
    setBusy(true); setProblem(null)
    try { await call('me/next-of-kin', 'PUT', { full_name: name.trim(), relationship: rel.trim(), phone: phone.trim() }); router.refresh(); onClose(); onDone('Next of kin saved') }
    catch (e) { setProblem(words(e)) } finally { setBusy(false) }
  }
  return (
    <Sheet eyebrow="Set up" title="Next of kin" lede="Someone we can reach about your account and your Care Purse if we can’t reach you." onClose={onClose}
      foot={<><button type="button" className="btn soft" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={busy || !ready} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="field-row"><label className="label" htmlFor="kin-name">Full name</label>
        <input id="kin-name" className="field" autoComplete="off" autoFocus value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field-row"><label className="label" htmlFor="kin-rel">Relationship</label>
        <input id="kin-rel" className="field" autoComplete="off" placeholder="Sister, husband, friend" value={rel} onChange={e => setRel(e.target.value)} /></div>
      <div className="field-row"><label className="label" htmlFor="kin-phone">Phone</label>
        <input id="kin-phone" className="field mono" type="tel" inputMode="tel" autoComplete="off" placeholder="0803 123 4567" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16))} /></div>
      {problem && <p className="err" role="alert">{problem}</p>}
    </Sheet>
  )
}

/** The sheet for one set-up step. */
export function SetupSheet({ step, onClose, onDone }: { step: string; onClose: () => void; onDone: Done }) {
  switch (step) {
    case 'bvn': return <BvnSheet onClose={onClose} onDone={onDone} />
    case 'nin': return <NinSheet onClose={onClose} onDone={onDone} />
    case 'phone': return <PhoneSheet onClose={onClose} onDone={onDone} />
    case 'selfie': return <SelfieSheet onClose={onClose} onDone={onDone} />
    case 'next_of_kin': return <KinSheet onClose={onClose} onDone={onDone} />
    default: return null
  }
}
