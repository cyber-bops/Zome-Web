'use client'

import { useEffect, useState } from 'react'

// The amount being entered: ₦ and the figure, which steps down in size as it
// grows so a large amount still fits on one line. With `pad`, a phone gets a
// number pad in place of its keyboard; a computer types into the field.

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const

/** The figure's size step for a formatted amount: 0 is the largest. */
export function fit(shown: string): number {
  const n = shown.length
  return n <= 6 ? 0 : n <= 7 ? 1 : n <= 9 ? 2 : 3
}

export function usePhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const m = matchMedia('(max-width: 720px) and (pointer: coarse)')
    const on = () => setPhone(m.matches)
    on(); m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

/** The number pad on its own, for a screen that places it at the bottom. */
export function NumPad({ digits, onDigits, max = 5_000_000 }: { digits: string; onDigits: (d: string) => void; max?: number }) {
  const take = (raw: string) => {
    const d = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (Number(d || 0) <= max) onDigits(d === '0' ? '' : d)
  }
  return (
    <div className="numpad" role="group" aria-label="Number pad">
      {KEYS.map(k => (
        <button key={k} type="button" onClick={() => take(k === 'del' ? digits.slice(0, -1) : digits + k)} aria-label={k === 'del' ? 'Delete' : undefined}>
          {k === 'del'
            ? <svg viewBox="0 0 26 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M8 2h15a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8L1 11z" /><path d="M12 7l8 8M20 7l-8 8" strokeLinecap="round" /></svg>
            : k}
        </button>
      ))}
    </div>
  )
}

export function Amount({ id, digits, onDigits, onEnter, max = 5_000_000, pad, padElsewhere, autoFocus, label = 'Amount' }: {
  id: string; digits: string; onDigits: (d: string) => void; onEnter?: () => void
  max?: number; pad?: boolean; autoFocus?: boolean; label?: string
  /** The screen draws a NumPad itself: on a phone, keep the keyboard away. */
  padElsewhere?: boolean
}) {
  const phone = usePhone()
  const withPad = (!!pad || !!padElsewhere) && phone
  const shown = digits ? Number(digits).toLocaleString('en-NG') : ''
  const take = (raw: string) => {
    const d = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (Number(d || 0) <= max) onDigits(d === '0' ? '' : d)
  }
  const press = (k: (typeof KEYS)[number]) => take(k === 'del' ? digits.slice(0, -1) : digits + k)
  return (
    <>
      <label className="sr" htmlFor={id}>{label}</label>
      <div className={`amt fit-${fit(shown)}`}>
        <span>₦</span>
        <input id={id} inputMode={withPad ? 'none' : 'numeric'} readOnly={withPad} autoComplete="off" placeholder="0"
          autoFocus={autoFocus && !withPad} value={shown}
          onChange={e => take(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }} />
      </div>
      {withPad && !padElsewhere && (
        <div className="numpad" role="group" aria-label="Number pad">
          {KEYS.map(k => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'del' ? 'Delete' : undefined}>
              {k === 'del'
                ? <svg viewBox="0 0 26 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M8 2h15a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8L1 11z" /><path d="M12 7l8 8M20 7l-8 8" strokeLinecap="round" /></svg>
                : k}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
