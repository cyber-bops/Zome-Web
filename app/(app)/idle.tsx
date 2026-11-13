'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { Sheet } from './sheet'

// Signed out after 15 minutes with nothing done (ADR-0056). Taps, keys and
// scrolls count, in any tab; the API is told at most every half minute, as it
// ends an idle web session on its own. A minute before the end: "Still there?"

const IDLE = 15 * 60_000
const WARN = 60_000
const PING = 30_000
const KEY = 'zome.active'

const shared = () => { try { return Number(localStorage.getItem(KEY)) || 0 } catch { return 0 } }
const share = (t: number) => { try { localStorage.setItem(KEY, String(t)) } catch { /* this tab still counts */ } }
const ended = () => location.assign('/sign-in?ended=idle')

export function IdleGuard() {
  const last = useRef(Date.now())
  const pinged = useRef(Date.now())
  const warning = useRef(false)
  const [left, setLeft] = useState<number | null>(null)

  const ping = useCallback(() => {
    pinged.current = Date.now()
    call('auth/session').catch(e => { if (e instanceof Refused && e.status === 401) ended() })
  }, [])

  const here = useCallback(() => {
    const now = Date.now()
    last.current = now; share(now)
    warning.current = false; setLeft(null)
    if (now - pinged.current >= PING) ping()
  }, [ping])

  useEffect(() => {
    share(Date.now())
    const active = () => { if (!warning.current) here() }
    const tick = () => {
      const idle = Date.now() - (shared() || last.current)
      if (idle >= IDLE) {
        call('auth/sign-out', 'POST', {}).catch(() => {}).finally(ended)
        return
      }
      if (idle >= IDLE - WARN) { warning.current = true; setLeft(Math.ceil((IDLE - idle) / 1000)) }
      else if (warning.current) { warning.current = false; setLeft(null) }
    }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, active, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', tick)
    const t = setInterval(tick, 1000)
    return () => {
      events.forEach(e => window.removeEventListener(e, active, { capture: true }))
      document.removeEventListener('visibilitychange', tick)
      clearInterval(t)
    }
  }, [here])

  if (left === null) return null
  return (
    <Sheet eyebrow="Still there?" title={`Signing you out in ${left}s`}
      lede="To keep your money safe, we sign you out after 15 minutes away."
      onClose={here}
      foot={<>
        <button type="button" className="btn soft" onClick={() => { call('auth/sign-out', 'POST', {}).catch(() => {}).finally(() => location.assign('/sign-in')) }}>Sign out</button>
        <button type="button" className="btn" onClick={here}>Stay signed in</button>
      </>} />
  )
}
