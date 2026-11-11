'use client'

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="card">
      <h2>This page couldn’t load</h2>
      <p className="muted note">Nothing in your Care Purse was changed. Try again in a moment.{error.digest ? ` Reference ${error.digest}.` : ''}</p>
      <button type="button" className="btn" onClick={reset}>Try again</button>
    </section>
  )
}
