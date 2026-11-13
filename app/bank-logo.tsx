'use client'

import { useState } from 'react'

// A bank's logo when there is one (the apps' set, through /api/bank-logo),
// otherwise its initials in the same round badge.
export function BankLogo({ code, name, className = '' }: { code?: string; name?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const initials = (name ?? '').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'B'
  const q = new URLSearchParams()
  if (code) q.set('code', code)
  if (name) q.set('name', name)
  return (
    <span className={`bank-logo ${className}`} aria-hidden="true">
      {failed || (!code && !name) ? initials
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={`/api/bank-logo?${q}`} alt="" width={28} height={28} onError={() => setFailed(true)} />}
    </span>
  )
}
