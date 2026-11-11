import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAllowed, passedHeaders, signsIn } from './door.ts'

test('only the listed routes pass the door', () => {
  assert.equal(isAllowed('POST', 'auth/sign-in'), true)
  assert.equal(isAllowed('GET', 'vault'), true)
  assert.equal(isAllowed('GET', 'me/profile'), true)
  assert.equal(isAllowed('PUT', 'me/profile'), true)
  assert.equal(isAllowed('POST', 'vault'), false, 'the method matters')
  assert.equal(isAllowed('GET', 'vault/../merchant/me'), false)
  assert.equal(isAllowed('GET', 'vaultx'), false)
  assert.equal(isAllowed('DELETE', 'me'), false, 'closing an account is not on the web yet')
})

test('the code and the password are the two ways in', () => {
  assert.equal(signsIn('auth/verify'), true)
  assert.equal(signsIn('auth/sign-in'), true)
  assert.equal(signsIn('auth/start'), false)
})

test('only a top-up passes its Idempotency-Key on', () => {
  const h = new Headers({ 'Idempotency-Key': 'web-123', Authorization: 'Bearer stolen' })
  assert.deepEqual(passedHeaders('vault/top-ups', h), { 'Idempotency-Key': 'web-123' })
  assert.deepEqual(passedHeaders('auth/sign-in', h), {})
  assert.deepEqual(passedHeaders('vault/top-ups', new Headers({ 'Idempotency-Key': 'bad key; x' })), {})
  assert.equal(isAllowed('POST', 'vault/top-ups'), true)
})
