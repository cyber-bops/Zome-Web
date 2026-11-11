// Dates as a business in Lagos reads them.
const zone = 'Africa/Lagos'

export function longDate(d: Date): string {
  return new Intl.DateTimeFormat('en-NG', { weekday: 'long', month: 'long', day: 'numeric', timeZone: zone }).format(d)
}

export function shortTime(iso: string): string {
  const d = new Date(iso)
  const today = new Intl.DateTimeFormat('en-NG', { dateStyle: 'short', timeZone: zone }).format(new Date())
  const day = new Intl.DateTimeFormat('en-NG', { dateStyle: 'short', timeZone: zone }).format(d)
  const time = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(d)
  return day === today ? time : `${new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: zone }).format(d)}, ${time}`
}

/** "Good morning", by the hour in Lagos. */
export function greeting(d: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-NG', { hour: 'numeric', hourCycle: 'h23', timeZone: zone }).format(d))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/** 12 Oct, from a YYYY-MM-DD Lagos day. */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

/** 12 Oct, for a timestamp, Lagos time. */
export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: zone }).format(new Date(iso))
}

/** A whole month's name, this month in Lagos. */
export function monthName(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-NG', { month: 'long', timeZone: zone }).format(d)
}
