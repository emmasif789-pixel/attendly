import test from 'node:test'
import assert from 'node:assert/strict'
import { statusLabel, statusBadgeClass, attendancePercent } from '../src/statusLogic.js'

test('labels and badge styles', () => {
  assert.equal(statusLabel('present'), 'Present')
  assert.equal(statusLabel('absent'), 'Absent')
  assert.equal(statusLabel('leave'), 'Leave')
  assert.equal(statusBadgeClass('present'), 'badge ok')
  assert.equal(statusBadgeClass('absent'), 'badge bad')
  assert.equal(statusBadgeClass('leave'), 'badge leave')
})

test('leave is excused: percentage uses present and absent only', () => {
  assert.equal(attendancePercent(1, 1), 50)
  assert.equal(attendancePercent(2, 1), 66.7)
  assert.equal(attendancePercent(3, 0), 100)
  assert.equal(attendancePercent(0, 0), null) // only leave days -> no percentage
})
