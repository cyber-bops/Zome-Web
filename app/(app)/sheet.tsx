'use client'

import { useEffect } from 'react'

// A pop-up in the Zome dashboards' pattern (zome-teams .modal): a white box
// with a head (title, one line, a close cross), a body, and a foot of two
// buttons. Centred on a wide screen; on a phone it sits at the bottom.
// Escape or a click outside closes it.
export function Sheet({ title, lede, onClose, foot, children, narrow }: {
  title: string
  lede?: string
  onClose: () => void
  foot?: React.ReactNode
  children?: React.ReactNode
  narrow?: boolean
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    document.body.classList.add('locked')
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('locked') }
  }, [onClose])
  return (
    <div className="modal-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal${narrow ? ' narrow' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          {lede && <p>{lede}</p>}
        </div>
        {children && <div className="modal-body">{children}</div>}
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  )
}
