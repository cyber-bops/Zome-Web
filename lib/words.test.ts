import { test } from 'node:test'
import assert from 'node:assert/strict'
import { movementStamp, movementTitle, movementWhat } from './words.ts'

test('movements read as the iOS app words them', () => {
  assert.equal(movementTitle({ kind: 'top_up', amount_kobo: 100 }), 'Added')
  assert.equal(movementTitle({ kind: 'payment', amount_kobo: -100 }), 'Paid a bill')
  assert.equal(movementTitle({ kind: 'team', amount_kobo: 100, from: 'Andela' }), 'From Andela')
  assert.equal(movementTitle({ kind: 'payment', amount_kobo: -100, from: 'Healing Hands Pharmacy' }), 'Paid Healing Hands Pharmacy', 'the server names the business')
  assert.equal(movementTitle({ kind: 'team', amount_kobo: 100 }), 'From your employer')
  assert.equal(movementTitle({ kind: 'other', amount_kobo: -5 }), 'Paid')
  assert.equal(movementWhat({ kind: 'team', amount_kobo: 1 }), 'Health allowance')
})

test('only bills paid and benefits carry a stamp', () => {
  assert.deepEqual(movementStamp({ kind: 'payment' }), { word: 'PAID', tone: 'blue' })
  assert.deepEqual(movementStamp({ kind: 'team' }), { word: 'BENEFIT', tone: 'green' })
  assert.equal(movementStamp({ kind: 'top_up' }), null)
})
