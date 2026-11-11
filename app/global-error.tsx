'use client'

import './globals.css'
import { StatusPage } from './status-page'

// When even the app's frame fails: its own page, with its own html.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <StatusPage code="Error" tone="bad" title="Zome couldn’t start" reference={error.digest}
          actions={<button type="button" className="btn" onClick={reset}>Try again</button>}>
          Something failed before Zome could load. Try again in a moment.
        </StatusPage>
      </body>
    </html>
  )
}
