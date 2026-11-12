import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deviceKey, sessionCookieAge, SESSION_COOKIE_OPTIONS } from './session.ts'

test('the cookie ends when the session does', () => {
  const now = Date.parse('2026-11-11T10:00:00Z')
  assert.equal(sessionCookieAge('2026-11-11T11:00:00Z', now), 3600)
  assert.equal(sessionCookieAge('2026-11-11T09:00:00Z', now), 0, 'an ended session keeps no cookie')
  assert.equal(sessionCookieAge('2027-11-11T10:00:00Z', now), SESSION_COOKIE_OPTIONS.maxAge, 'never past the most')
  assert.equal(sessionCookieAge(undefined, now), SESSION_COOKIE_OPTIONS.maxAge)
})

test('a browser keeps a good device key, and gets a fresh one otherwise', () => {
  const good = 'a'.repeat(43)
  assert.equal(deviceKey(good), good)
  for (const bad of [undefined, '', 'short', 'x'.repeat(31), 'a'.repeat(40) + '!!!']) {
    const fresh = deviceKey(bad)
    assert.match(fresh, /^[A-Za-z0-9_-]{43}$/)
  }
  assert.notEqual(deviceKey(undefined), deviceKey(undefined))
})
