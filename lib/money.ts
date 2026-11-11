// Naira, to the kobo. Amounts travel as whole kobo; they are only ever turned
// into naira to show them, and typed naira are read back exactly.

const grouped = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const whole = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

/** ₦8,500.00, or ₦8,500 with `round`. */
export function naira(kobo: number, round = false): string {
  const sign = kobo < 0 ? '-' : ''
  const n = Math.abs(kobo) / 100
  return `${sign}₦${round && Number.isInteger(n) ? whole.format(n) : grouped.format(n)}`
}

/** Typed naira ("8,500", "₦8500.5") as whole kobo, or null if it is not an amount. */
export function koboFromTyped(text: string): number | null {
  const t = text.replace(/[₦,\s]/g, '')
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(t)) return null
  const [n, k = ''] = t.split('.')
  const kobo = Number(n) * 100 + Number((k + '00').slice(0, 2))
  return kobo > 0 ? kobo : null
}

/** A pay code as typed: six digits, spaces allowed. */
export function payCodeFromTyped(text: string): string | null {
  const t = text.replace(/\s/g, '')
  return /^\d{6}$/.test(t) ? t : null
}
