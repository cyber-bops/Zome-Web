'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { call, Refused } from '@/lib/client'

// The profile photo (ADR-0063). The browser crops a chosen picture square and
// shrinks it to 512 pixels; the server checks what it really is from its
// bytes, re-encodes it (dropping where it was taken and the phone that took
// it) and keeps it private, shown here through a link that works for an hour.

const SIDE = 512

async function square(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.')
  if (file.size > 15 * 1024 * 1024) throw new Error('That photo is over 15 MB. Choose a smaller one.')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('That photo couldn’t be opened. Try another.') })
  const side = Math.min(bitmap.width, bitmap.height)
  const out = Math.max(32, Math.min(SIDE, side))
  const canvas = document.createElement('canvas')
  canvas.width = out; canvas.height = out
  canvas.getContext('2d')?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.9)
}

export function ProfilePhoto({ initials, photoUrl }: { initials: string; photoUrl?: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'' | 'upload' | 'remove'>('')
  const [problem, setProblem] = useState<string | null>(null)

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy('upload'); setProblem(null)
    try {
      await call('me/photo', 'PUT', { content: await square(file) })
      router.refresh()
    } catch (err) {
      setProblem(err instanceof Refused ? err.message : (err as Error).message)
    } finally {
      setBusy('')
    }
  }

  async function remove() {
    setBusy('remove'); setProblem(null)
    try {
      await call('me/photo', 'DELETE')
      router.refresh()
    } catch (err) {
      setProblem(err instanceof Refused ? err.message : 'That didn’t work this time. Please try again.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="photo-edit">
      <button type="button" className="avatar photo-btn" aria-label={photoUrl ? 'Change your photo' : 'Add a photo'}
        disabled={!!busy} onClick={() => input.current?.click()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photoUrl ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" /> : initials}
        <span className="photo-cam" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="13" r="3.2" /></svg>
        </span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={choose} />
      <div className="photo-links">
        <button type="button" className="link-btn" disabled={!!busy} onClick={() => input.current?.click()}>
          {busy === 'upload' ? 'Uploading…' : photoUrl ? 'Change photo' : 'Add a photo'}
        </button>
        {photoUrl && <button type="button" className="link-btn mut" disabled={!!busy} onClick={remove}>{busy === 'remove' ? 'Removing…' : 'Remove'}</button>}
      </div>
      {problem && <p className="problem gap" role="alert">{problem}</p>}
    </div>
  )
}
