// How a sign-in names this browser, so "someone signed in" emails say where
// (ADR-0052 §1): "Chrome on Mac (web)". Never the full user agent.
export function deviceName(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'A browser'
  const system = /iPhone|iPad/.test(ua) ? 'iPhone'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'Mac'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : ''
  return `${browser}${system ? ` on ${system}` : ''} (web)`
}
