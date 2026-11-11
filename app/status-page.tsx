import { ZomeMark } from './mark'

// One calm page for everything that isn't the page asked for: not found,
// taking too long, something broke. Usable from server and client alike.
export function StatusPage({ code, title, children, actions, reference, tone = 'neutral' }: {
  code: string
  title: string
  children: React.ReactNode
  actions: React.ReactNode
  reference?: string
  tone?: 'neutral' | 'warn' | 'bad'
}) {
  return (
    <main className={`status-page ${tone}`}>
      <div className="status-card">
        <div className="status-head">
          <span className="badge"><ZomeMark /></span>
          <span>Zome</span>
        </div>
        <p className="status-code" aria-hidden="true">{code}</p>
        <h1 className="status-title">{title}</h1>
        <p className="status-text">{children}</p>
        <div className="status-actions">{actions}</div>
        {reference && <p className="status-ref">Reference <span className="mono">{reference}</span>. Quote it if you report this.</p>}
      </div>
    </main>
  )
}
