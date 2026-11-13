import Link from 'next/link'
import { ZomeMark } from './mark'

// A legal document from the zome repo (tools/sync-terms.mjs), drawn with the
// few kinds of block those documents use.

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<b key={`${key}-${i++}`}>{m[1]}</b>)
    else if (/^https?:\/\//.test(m[3])) out.push(<a key={`${key}-${i++}`} href={m[3]} rel="noopener noreferrer">{m[2]}</a>)
    else out.push(m[2])
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function blocks(md: string): React.ReactNode[] {
  const lines = md.split('\n')
  const out: React.ReactNode[] = []
  let para: string[] = [], list: string[] = [], table: string[][] = []
  const flush = () => {
    const k = `b${out.length}`
    if (para.length) { out.push(<p key={k}>{inline(para.join(' '), k)}</p>); para = [] }
    if (list.length) { out.push(<ul key={k}>{list.map((l, i) => <li key={i}>{inline(l, `${k}-${i}`)}</li>)}</ul>); list = [] }
    if (table.length) {
      const [head, ...rows] = table.filter(r => !r.every(c => /^-+$/.test(c)))
      out.push(<table key={k}><thead><tr>{head.map((c, i) => <th key={i}>{inline(c, `${k}-h${i}`)}</th>)}</tr></thead>
        <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, i) => <td key={i}>{inline(c, `${k}-${j}-${i}`)}</td>)}</tr>)}</tbody></table>)
      table = []
    }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flush(); continue }
    if (line.startsWith('|')) { if (para.length || list.length) flush(); table.push(line.slice(1, -1).split('|').map(c => c.trim())); continue }
    if (line.startsWith('- ')) { if (para.length || table.length) flush(); list.push(line.slice(2)); continue }
    if (list.length && /^\s+\S/.test(raw)) { list[list.length - 1] += ' ' + line.trim(); continue }
    if (line === '---') { flush(); out.push(<hr key={`b${out.length}`} />); continue }
    const h = /^(#{1,3}) (.*)$/.exec(line)
    if (h) {
      flush()
      const k = `b${out.length}`
      out.push(h[1].length === 1 ? <h1 key={k}>{h[2]}</h1> : h[1].length === 2 ? <h2 key={k} id={h[2].split('.')[0]}>{h[2]}</h2> : <h3 key={k}>{h[2]}</h3>)
      continue
    }
    if (list.length || table.length) flush()
    para.push(line.trim())
  }
  flush()
  return out
}

export function LegalDoc({ text }: { text: string }) {
  return (
    <main className="legal">
      <Link href="/" className="wm"><ZomeMark />Zome</Link>
      <article>{blocks(text)}</article>
    </main>
  )
}
