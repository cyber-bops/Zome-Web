'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { call, Refused } from '@/lib/client'
import { forget } from '@/lib/remembered'

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
      setProblem(e instanceof Refused ? e.message : 'That didn’t work this time. Please try again.')
      setBusy(null)
    }
  }

  return (
    <>
      <div className="row"><span>Sign out of this browser</span>
        <button type="button" className="btn soft" disabled={!!busy} onClick={() => out(false)}>{busy === 'one' ? 'Signing out…' : 'Sign out'}</button></div>
      <div className="row"><span>Sign out everywhere</span>
        <button type="button" className="btn danger" disabled={!!busy} onClick={() => out(true)}>{busy === 'all' ? 'Signing out…' : 'Sign out everywhere'}</button></div>
      {problem && <p className="problem gap" role="alert">{problem}</p>}
    </>
  )
}
