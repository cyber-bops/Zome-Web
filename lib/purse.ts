// Figures the Care Purse screens draw from the API's movements. Amounts are
// whole kobo; movements come newest first.
export type Moved = { kind: string; amount_kobo: number; at: string }

const zone = 'Africa/Lagos'
const month = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(d).slice(0, 7)

/** This month's money in (not counting interest), money out, and interest. */
export function monthTotals(movements: Moved[], now = new Date()): { in: number; out: number; interest: number } {
  const m = month(now)
  const these = movements.filter(x => month(new Date(x.at)) === m)
  return {
    in: these.filter(x => x.amount_kobo > 0 && x.kind !== 'interest').reduce((a, x) => a + x.amount_kobo, 0),
    out: 0 - these.filter(x => x.amount_kobo < 0).reduce((a, x) => a + x.amount_kobo, 0),
    interest: these.filter(x => x.kind === 'interest').reduce((a, x) => a + x.amount_kobo, 0),
  }
}

/**
 * The balance at the end of each of the last `days` days, oldest first,
 * worked back from today's balance through the movements. Only as far back
 * as the movements reach: an older movement the list doesn't hold is not
 * guessed at.
 */
export function balanceLine(balance: number, movements: Moved[], days = 30, now = Date.now()): number[] {
  const out: number[] = []
  let b = balance
  let i = 0
  const sorted = [...movements].sort((a, z) => Date.parse(z.at) - Date.parse(a.at))
  for (let d = 0; d < days; d++) {
    const endOfDay = now - d * 864e5
    while (i < sorted.length && Date.parse(sorted[i].at) > endOfDay) { b -= sorted[i].amount_kobo; i++ }
    out.push(b)
  }
  return out.reverse()
}

/**
 * What has been paid out so far this month, day by day: one running total for
 * each day from the 1st to today, for the spending chart.
 */
export function spentThisMonth(movements: Moved[], now = new Date()): number[] {
  const m = month(now)
  const day = (d: Date) => Number(new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Africa/Lagos' }).format(d))
  const today = day(now)
  const per = new Array(today).fill(0)
  for (const x of movements) {
    const at = new Date(x.at)
    if (x.amount_kobo < 0 && month(at) === m) per[Math.min(today, day(at)) - 1] -= x.amount_kobo
  }
  let run = 0
  return per.map(v => (run += v))
}
