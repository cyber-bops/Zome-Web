'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { call, Refused } from '@/lib/client'
import { forget } from '@/lib/remembered'

type Look = 'system' | 'light' | 'dark'

function currentLook(): Look {
  const m = document.cookie.match(/(?:^|; )zome_look=(light|dark)/)
  return (m?.[1] as Look) ?? 'system'
}

export function LookSwitch() {
  const [look, setLook] = useState<Look>('system')
  useEffect(() => setLook(currentLook()), [])
  const choose = (l: Look) => {
    setLook(l)
    document.cookie = l === 'system' ? 'zome_look=; Max-Age=0; Path=/; SameSite=Lax' : `zome_look=${l}; Max-Age=31536000; Path=/; SameSite=Lax`
    if (l === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', l)
  }
  return (
    <div className="seg" role="group" aria-label="Look">
      {(['system', 'light', 'dark'] as Look[]).map(l => (
        <button key={l} type="button" aria-pressed={look === l} onClick={() => choose(l)}>{l === 'system' ? 'Auto' : l === 'light' ? 'Light' : 'Dark'}</button>
      ))}
    </div>
  )
}

export function AccountActions() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  async function out(everywhere: boolean) {
    setBusy(everywhere ? 'all' : 'one')
    setProblem(null)
    try {
      await call(everywhere ? 'auth/sign-out-all' : 'auth/sign-out', 'POST', {})
      // Signing out everywhere also forgets this browser for Welcome back.
      if (everywhere) forget()
      router.replace('/sign-in')
      router.refresh()
    } catch (e) {
      setProblem(e instanceof Refused ? e.message : 'That didn’t go through. Try again.')
      setBusy(null)
    }
  }

  return (
    <>
      <div className="row"><div><b>Sign out</b><span className="s">On this browser only.</span></div>
        <button type="button" className="btn soft" disabled={!!busy} onClick={() => out(false)}>{busy === 'one' ? 'Signing out…' : 'Sign out'}</button></div>
      <div className="row"><div><b>Sign out everywhere</b><span className="s">Ends every session, on your phone too.</span></div>
        <button type="button" className="btn danger" disabled={!!busy} onClick={() => out(true)}>{busy === 'all' ? 'Signing out…' : 'Sign out everywhere'}</button></div>
      {problem && <p className="problem gap" role="alert">{problem}</p>}
    </>
  )
}
