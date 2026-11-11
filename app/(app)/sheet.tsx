'use client'

import { useEffect } from 'react'

// A sheet over the page: from the bottom on a phone, centred on a laptop.
// Escape or a tap outside closes it.
export function Sheet({ title, onClose, light, children }: { title?: string; onClose: () => void; light?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    document.body.classList.add('locked')
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('locked') }
  }, [onClose])
  return (
    <div className="scrim" onClick={onClose}>
      <div className={`sheet${light ? ' light' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="grab" aria-hidden="true" />
        {title && <div className="sheet-hd"><h2>{title}</h2><button type="button" onClick={onClose}>Close</button></div>}
        {children}
      </div>
    </div>
  )
}
