import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naira, koboFromTyped, payCodeFromTyped } from './money.ts'

test('kobo is shown as naira', () => {
  assert.equal(naira(850000), '₦8,500.00')
  assert.equal(naira(850000, true), '₦8,500')
  assert.equal(naira(1250), '₦12.50')
  assert.equal(naira(-300000), '-₦3,000.00')
})

test('typed naira are read exactly', () => {
  assert.equal(koboFromTyped('8,500'), 850000)
  assert.equal(koboFromTyped('₦8500.5'), 850050)
  assert.equal(koboFromTyped(' 0.30 '), 30)
  for (const bad of ['', '0', '-5', '5.123', 'five', '1e3', '5..0']) {
    assert.equal(koboFromTyped(bad), null, bad)
  }
})

test('a pay code is six digits', () => {
  assert.equal(payCodeFromTyped('048 213'), '048213')
  assert.equal(payCodeFromTyped('48213'), null)
  assert.equal(payCodeFromTyped('04821a'), null)
})
