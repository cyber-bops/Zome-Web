'use client'

import { useEffect } from 'react'
import { CrossIcon } from '../icons'

// A pop-up as a paper slip: a head (a small label, the title, a close cross),
// a body, and a foot of one or two buttons. Escape or a click outside closes it.
export function Sheet({ title, eyebrow, lede, onClose, foot, children }: {
  title: string
  eyebrow?: string
  lede?: string
  onClose: () => void
  foot?: React.ReactNode
  children?: React.ReactNode
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    document.body.classList.add('locked')
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('locked') }
  }, [onClose])
  return (
    <div className="modal-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {eyebrow && <span className="lbl">{eyebrow}</span>}
          <h2>{title}</h2>
          {lede && <p>{lede}</p>}
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><CrossIcon /></button>
        </div>
        {children && <div className="modal-body">{children}</div>}
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  )
}
