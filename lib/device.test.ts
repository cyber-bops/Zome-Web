import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deviceName } from './device.ts'

test('a browser is named plainly', () => {
  assert.equal(deviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'), 'Chrome on Mac (web)')
  assert.equal(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), 'Safari on iPhone (web)')
  assert.equal(deviceName('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'), 'Chrome on Android (web)')
  assert.equal(deviceName(''), 'A browser (web)')
})
