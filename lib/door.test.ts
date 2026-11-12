import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bodyLimit, isAllowed, passedHeaders, passedQuery, sessionless, signsIn } from './door.ts'

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

test('the code, the password and Google are the ways in', () => {
  assert.equal(signsIn('auth/verify'), true)
  assert.equal(signsIn('auth/sign-in'), true)
  assert.equal(signsIn('auth/provider'), true)
  assert.equal(isAllowed('POST', 'auth/provider'), true)
  assert.equal(signsIn('auth/start'), false)
})

test('only a top-up passes its Idempotency-Key on', () => {
  const h = new Headers({ 'Idempotency-Key': 'web-123', Authorization: 'Bearer stolen' })
  assert.deepEqual(passedHeaders('vault/top-ups', h), { 'Idempotency-Key': 'web-123' })
  assert.deepEqual(passedHeaders('auth/sign-in', h), {})
  assert.deepEqual(passedHeaders('vault/top-ups', new Headers({ 'Idempotency-Key': 'bad key; x' })), {})
  assert.equal(isAllowed('POST', 'vault/top-ups'), true)
})

test('paying for care opens only its own routes', () => {
  const org = '0b6f1e2a-1111-4222-8333-944455556666'
  assert.equal(isAllowed('POST', `vault/merchants/${org}/pay`), true)
  assert.equal(isAllowed('POST', 'vault/merchants/../pay'), false)
  assert.equal(isAllowed('POST', `vault/bills/${org}/approve`), true)
  assert.equal(isAllowed('POST', `vault/bills/${org}/refund`), false)
  assert.equal(isAllowed('POST', 'vault/pin/change'), false, 'changing a PIN is not on the web yet')
  const h = new Headers({ 'Idempotency-Key': 'web-9' })
  assert.deepEqual(passedHeaders(`vault/merchants/${org}/pay`, h), { 'Idempotency-Key': 'web-9' })
  assert.deepEqual(passedHeaders(`vault/bills/${org}/approve`, h), {})
})

test('only the search words reach the directory', () => {
  assert.equal(passedQuery('vault/merchants', new URLSearchParams({ q: 'pharmacy', evil: '1' })), '?q=pharmacy')
  assert.equal(passedQuery('vault/merchants', new URLSearchParams()), '')
  assert.equal(passedQuery('vault', new URLSearchParams({ q: 'x' })), '')
})

test('a transfer to a bank is keyed, its lookup is not', () => {
  const h = new Headers({ 'Idempotency-Key': 'web-7' })
  assert.deepEqual(passedHeaders('vault/transfers', h), { 'Idempotency-Key': 'web-7' })
  assert.deepEqual(passedHeaders('vault/transfer-lookup', h), {})
  assert.equal(isAllowed('GET', 'vault/transfers/0b6f1e2a-1111-4222-8333-944455556666'), true)
  assert.equal(isAllowed('DELETE', 'vault/transfers'), false)
})

test('the BVN and its code pass; nothing else under me/ does', () => {
  assert.equal(isAllowed('POST', 'me/bvn'), true)
  assert.equal(isAllowed('POST', 'me/bvn/confirm'), true)
  assert.equal(isAllowed('GET', 'me/bvn'), false)
  assert.equal(isAllowed('POST', 'me/selfie'), true)
  assert.equal(isAllowed('POST', 'me/phone/code'), true)
  assert.equal(isAllowed('PUT', 'me/next-of-kin'), true)
  assert.equal(isAllowed('DELETE', 'me/next-of-kin'), false)
})

test('only a selfie may be large', () => {
  assert.equal(bodyLimit('me/selfie'), 5 * 1024 * 1024)
  assert.equal(bodyLimit('vault/transfers'), 16_384)
})

test('a linked account: one-tap funding is keyed, unlinking is a DELETE of the current link only', () => {
  assert.deepEqual(passedHeaders('vault/debits', new Headers({ 'Idempotency-Key': 'web-1' })), { 'Idempotency-Key': 'web-1' })
  assert.deepEqual(passedHeaders('vault/debits/quote', new Headers({ 'Idempotency-Key': 'web-1' })), {})
  assert.equal(isAllowed('DELETE', 'vault/mandates/current'), true)
  assert.equal(isAllowed('DELETE', 'vault/mandates/abc'), false)
  assert.equal(isAllowed('PUT', 'vault/schedule'), true)
})

test('the giving page needs no session and carries its key; the person’s link needs theirs', () => {
  assert.equal(isAllowed('GET', 'give/ada-k7m2qx'), true)
  assert.equal(isAllowed('POST', 'give/ada-k7m2qx'), true)
  assert.equal(isAllowed('GET', 'give/../vault'), false)
  assert.equal(sessionless('give/ada-k7m2qx'), true)
  assert.equal(sessionless('me/gift-link'), false)
  assert.deepEqual(passedHeaders('give/ada-k7m2qx', new Headers({ 'Idempotency-Key': 'web-3' })), { 'Idempotency-Key': 'web-3' })
})
