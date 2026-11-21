import test from 'node:test'
import assert from 'node:assert/strict'
import { isDirty, unmarkedStudents, changedRows, countMarks } from '../src/attendanceLogic.js'

const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

test('nothing marked, nothing saved: not dirty, all unmarked', () => {
  assert.equal(isDirty(students, {}, {}), false)
  assert.equal(unmarkedStudents(students, {}).length, 3)
  assert.deepEqual(countMarks(students, {}), { present: 0, absent: 0, unmarked: 3 })
})

test('first save sends every marked student', () => {
  const marks = { a: 'present', b: 'absent', c: 'present' }
  assert.equal(isDirty(students, marks, {}), true)
  assert.equal(unmarkedStudents(students, marks).length, 0)
  const rows = changedRows(students, marks, {}, 'sec', '2026-11-20')
  assert.equal(rows.length, 3)
  assert.deepEqual(rows[1], { student_id: 'b', section_id: 'sec', date: '2026-11-20', status: 'absent' })
})

test('edit sends only the changed student', () => {
  const saved = { a: 'present', b: 'absent', c: 'present' }
  const marks = { ...saved, b: 'present' }
  assert.equal(isDirty(students, marks, saved), true)
  const rows = changedRows(students, marks, saved, 'sec', '2026-11-20')
  assert.deepEqual(rows.map((r) => r.student_id), ['b'])
  assert.equal(rows[0].status, 'present')
})

test('unchanged marks are not dirty and send nothing', () => {
  const saved = { a: 'present', b: 'absent', c: 'present' }
  assert.equal(isDirty(students, { ...saved }, saved), false)
  assert.equal(changedRows(students, { ...saved }, saved, 'sec', 'd').length, 0)
})

test('student added after a save shows as unmarked and as a change once marked', () => {
  const saved = { a: 'present', b: 'absent' }
  const withNew = [...students]
  assert.equal(unmarkedStudents(withNew, { ...saved }).length, 1)
  const marks = { ...saved, c: 'present' }
  assert.deepEqual(changedRows(withNew, marks, saved, 'sec', 'd').map((r) => r.student_id), ['c'])
})

test('counts', () => {
  assert.deepEqual(countMarks(students, { a: 'present', b: 'absent' }), { present: 1, absent: 1, unmarked: 1 })
})
