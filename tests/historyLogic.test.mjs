import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeSearch, pageRange, lastPage, pageLabel, validateRange, lastDaysRange, presentRate } from '../src/historyLogic.js'

test('sanitizeSearch removes filter-breaking characters but keeps names', () => {
  assert.equal(sanitizeSearch('  eman  '), 'eman')
  assert.equal(sanitizeSearch('a,b)c(d'), 'a b c d')
  assert.equal(sanitizeSearch('%*x\\"y'), 'x y')
  assert.equal(sanitizeSearch("O'Brien"), "O'Brien")
  assert.equal(sanitizeSearch(',,()'), '')
})

test('pagination ranges and labels', () => {
  assert.deepEqual(pageRange(0, 25), [0, 24])
  assert.deepEqual(pageRange(2, 25), [50, 74])
  assert.equal(lastPage(0, 25), 0)
  assert.equal(lastPage(25, 25), 0)
  assert.equal(lastPage(26, 25), 1)
  assert.equal(lastPage(100, 25), 3)
  assert.equal(pageLabel(0, 25, 0), 'No records')
  assert.equal(pageLabel(0, 25, 7), 'Showing 1–7 of 7')
  assert.equal(pageLabel(1, 25, 40), 'Showing 26–40 of 40')
  assert.equal(pageLabel(0, 25, 90), 'Showing 1–25 of 90')
})

test('validateRange', () => {
  assert.equal(validateRange('2026-11-01', '2026-11-21'), null)
  assert.equal(validateRange('2026-11-21', '2026-11-21'), null)
  assert.match(validateRange('2026-11-22', '2026-11-21'), /not be after/)
  assert.match(validateRange('', '2026-11-21'), /both dates/)
})

test('lastDaysRange includes today and goes back N-1 days', () => {
  assert.deepEqual(lastDaysRange('2026-11-21', 7), { from: '2026-11-15', to: '2026-11-21' })
  assert.deepEqual(lastDaysRange('2026-11-21', 30), { from: '2026-10-23', to: '2026-11-21' })
})

test('presentRate', () => {
  assert.equal(presentRate(0, 0), null)
  assert.equal(presentRate(2, 1), 66.7)
  assert.equal(presentRate(3, 0), 100)
  assert.equal(presentRate(0, 4), 0)
})
