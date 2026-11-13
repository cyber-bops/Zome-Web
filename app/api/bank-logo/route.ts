import { NextResponse } from 'next/server'

// A bank's logo, by its code or name, from the API (/v1/bank-logos/for), as
// the apps show them. Only these two short values pass; the picture is a PNG
// cached for a month. No session: logos are public.
const API = process.env.ZOME_API_URL ?? 'http://localhost:8080'

export async function GET(request: Request) {
  const given = new URL(request.url).searchParams
  const q = new URLSearchParams()
  const code = given.get('code')?.trim().slice(0, 20), name = given.get('name')?.trim().slice(0, 120)
  if (code && /^[\w-]+$/.test(code)) q.set('code', code)
  if (name) q.set('name', name)
  if (![...q.keys()].length) return new NextResponse(null, { status: 404 })
  try {
    const r = await fetch(`${API}/v1/bank-logos/for?${q}`, { cache: 'force-cache' })
    if (!r.ok || r.headers.get('content-type') !== 'image/png') return new NextResponse(null, { status: 404 })
    return new NextResponse(await r.arrayBuffer(), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=2592000, immutable', 'X-Content-Type-Options': 'nosniff' } })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
