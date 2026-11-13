'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sheet } from './sheet'

// A four-digit payment PIN on a keypad (or the keyboard's digits). `onPin`
// answers null when the PIN is taken, or the words to show when it isn't.
export function PinSheet({ eyebrow, title, lede, onPin, onClose, busyWord = 'Checking…' }: {
  eyebrow?: string; title: string; lede?: string
  onPin: (pin: string) => Promise<string | null>
  onClose: () => void
  busyWord?: string
}) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [shake, setShake] = useState(false)

  const press = useCallback((d: string) => {
    if (busy) return
    setProblem(null)
    setPin(p => (d === 'del' ? p.slice(0, -1) : p.length < 4 ? p + d : p))
  }, [busy])

  useEffect(() => {
    if (pin.length !== 4) return
    let gone = false
    setBusy(true)
    onPin(pin).then(err => {
      if (gone) return
      setBusy(false)
      if (err) { setProblem(err); setPin(''); setShake(true); setTimeout(() => setShake(false), 400) }
    })
    return () => { gone = true }
  }, [pin, onPin])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [press])

  return (
    <Sheet eyebrow={eyebrow} title={title} lede={lede} onClose={onClose}>
      <div className={`pin-dots${shake ? ' shake' : ''}`} aria-label={`${pin.length} of 4 digits`}>
        {[0, 1, 2, 3].map(i => <i key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      <div className="pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button key={d} type="button" onClick={() => press(d)}>{d}</button>)}
        <span />
        <button type="button" onClick={() => press('0')}>0</button>
        <button type="button" aria-label="Delete" onClick={() => press('del')}>⌫</button>
      </div>
      <p className="small center" role="status">{busy ? busyWord : problem ? <span className="err">{problem}</span> : 'Only you can approve a payment, with your 4-digit PIN.'}</p>
    </Sheet>
  )
}
