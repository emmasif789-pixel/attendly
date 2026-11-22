import test from 'node:test'
import assert from 'node:assert/strict'
import { rollCompare, sortStudents } from '../src/studentLogic.js'

test('numeric roll numbers sort as numbers, not text', () => {
  const rolls = ['10', '1', '101', '2', '102', '3', '11']
  assert.deepEqual([...rolls].sort(rollCompare), ['1', '2', '3', '10', '11', '101', '102'])
})

test('mixed letters and numbers sort naturally', () => {
  assert.deepEqual(['A10', 'A2', 'A1'].sort(rollCompare), ['A1', 'A2', 'A10'])
  assert.deepEqual(['b1', 'A2'].sort(rollCompare), ['A2', 'b1'])
})

test('students sort by section order first, then roll', () => {
  const sections = [{ id: 'med', position: 1 }, { id: 'eng', position: 2 }]
  const students = [
    { id: 1, roll_number: '101', section_id: 'eng' },
    { id: 2, roll_number: '10', section_id: 'med' },
    { id: 3, roll_number: '2', section_id: 'med' },
    { id: 4, roll_number: '102', section_id: 'eng' },
  ]
  assert.deepEqual(sortStudents(students, sections).map((s) => s.id), [3, 2, 1, 4])
})

test('does not change the original array', () => {
  const students = [{ id: 1, roll_number: '2', section_id: 'a' }, { id: 2, roll_number: '1', section_id: 'a' }]
  sortStudents(students, [{ id: 'a', position: 1 }])
  assert.equal(students[0].id, 1)
})
