import { test } from 'node:test'
import assert from 'node:assert/strict'
import { balanceLine, monthTotals, spentThisMonth } from './purse.ts'

const now = Date.parse('2026-11-20T12:00:00Z')
const day = 864e5
const moves = [
  { kind: 'top_up', amount_kobo: 500_000, at: new Date(now - 1 * 3600e3).toISOString() },
  { kind: 'payment', amount_kobo: -420_000, at: new Date(now - 2 * day).toISOString() },
  { kind: 'interest', amount_kobo: 12_850, at: new Date(now - 3 * day).toISOString() },
  { kind: 'top_up', amount_kobo: 2_000_000, at: new Date(now - 25 * day).toISOString() },
]

test('the balance line works back from today through each movement', () => {
  const line = balanceLine(2_092_850, moves, 30, now)
  assert.equal(line.length, 30)
  assert.equal(line[29], 2_092_850, 'today is today’s balance')
  assert.equal(line[28], 1_592_850, 'yesterday, before the ₦5,000 top-up')
  assert.equal(line[0], 0, 'before the first top-up there was nothing')
})

test('the month counts money in, out and interest apart', () => {
  const t = monthTotals(moves, new Date(now))
  assert.deepEqual(t, { in: 500_000, out: 420_000, interest: 12_850 }, 'the 26 October top-up is last month')
})

test('no movements: a flat line and nothing this month', () => {
  assert.deepEqual(balanceLine(0, [], 3, now), [0, 0, 0])
  assert.deepEqual(monthTotals([], new Date(now)), { in: 0, out: 0, interest: 0 })
})

test('spending this month runs day by day, payments only', () => {
  const now = new Date('2026-11-05T12:00:00+01:00')
  const line = spentThisMonth([
    { kind: 'payment', amount_kobo: -50000, at: '2026-11-02T09:00:00+01:00' },
    { kind: 'top_up', amount_kobo: 900000, at: '2026-11-03T09:00:00+01:00' },
    { kind: 'payment', amount_kobo: -20000, at: '2026-11-04T09:00:00+01:00' },
    { kind: 'payment', amount_kobo: -99999, at: '2026-10-30T09:00:00+01:00' },
  ], now)
  assert.deepEqual(line, [0, 50000, 50000, 70000, 70000])
})
