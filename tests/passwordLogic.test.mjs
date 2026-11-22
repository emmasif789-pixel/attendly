import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePassword, MIN_PASSWORD_LENGTH } from '../src/passwordLogic.js'

test('too short is rejected', () => {
  assert.match(validatePassword('abc123', 'abc123'), /at least/)
  assert.equal(MIN_PASSWORD_LENGTH, 10)
})
test('needs letters and numbers', () => {
  assert.match(validatePassword('abcdefghijkl', 'abcdefghijkl'), /letters and numbers/)
  assert.match(validatePassword('1234567890123', '1234567890123'), /letters and numbers/)
})
test('leading or trailing space is rejected', () => {
  assert.match(validatePassword(' abcdefgh12', ' abcdefgh12'), /space/)
  assert.match(validatePassword('abcdefgh12 ', 'abcdefgh12 '), /space/)
})
test('mismatch is rejected', () => {
  assert.match(validatePassword('abcdefgh12', 'abcdefgh13'), /do not match/)
})
test('a good password passes', () => {
  assert.equal(validatePassword('river-stone-47', 'river-stone-47'), null)
})
