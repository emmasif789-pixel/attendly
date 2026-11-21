import test from 'node:test'
import assert from 'node:assert/strict'
import { lastNDates, takenStatus, todayBySection, weekGrid } from '../src/dashboardLogic.js'

test('lastNDates counts back, including across month and year ends', () => {
  assert.deepEqual(lastNDates('2026-11-21', 3), ['2026-11-21', '2026-11-20', '2026-11-19'])
  assert.deepEqual(lastNDates('2026-03-02', 3), ['2026-03-02', '2026-03-01', '2026-02-28'])
  assert.deepEqual(lastNDates('2027-01-01', 2), ['2027-01-01', '2026-12-31'])
  assert.equal(lastNDates('2026-11-21', 7).length, 7)
})

test('takenStatus', () => {
  assert.equal(takenStatus(0, 0), 'empty')
  assert.equal(takenStatus(5, 0), 'none')
  assert.equal(takenStatus(5, 3), 'partial')
  assert.equal(takenStatus(5, 5), 'full')
})

const sections = [
  { section_id: 'med', section_name: 'FSC Pre-Medical', total_students: 2 },
  { section_id: 'eng', section_name: 'FSC Pre-Engineering', total_students: 1 },
]
const daily = [
  { section_id: 'med', date: '2026-11-21', present: 1, absent: 1, marked: 2 },
  { section_id: 'med', date: '2026-11-20', present: 2, absent: 0, marked: 2 },
  { section_id: 'eng', date: '2026-11-20', present: 1, absent: 0, marked: 1 },
]

test('today per section: taken, not taken, and not-marked counts', () => {
  const t = todayBySection(sections, daily, '2026-11-21')
  assert.deepEqual(t[0], { section_id: 'med', name: 'FSC Pre-Medical', total: 2, present: 1, absent: 1, notMarked: 0, status: 'full' })
  assert.deepEqual(t[1], { section_id: 'eng', name: 'FSC Pre-Engineering', total: 1, present: 0, absent: 0, notMarked: 1, status: 'none' })
})

test('student added after attendance was taken shows as partly taken', () => {
  const t = todayBySection([{ ...sections[0], total_students: 3 }], daily, '2026-11-21')
  assert.equal(t[0].notMarked, 1)
  assert.equal(t[0].status, 'partial')
})

test('week grid: percentages and empty days', () => {
  const g = weekGrid(sections, daily, ['2026-11-21', '2026-11-20', '2026-11-19'])
  assert.equal(g[0].cells[0].pct, 50)
  assert.equal(g[0].cells[1].pct, null)
  assert.equal(g[1].cells[0].pct, 100)
  assert.equal(g[1].cells[1].pct, 100)
  assert.equal(g[2].cells[0].pct, null)
  const third = weekGrid(sections, [{ section_id: 'eng', date: 'd', present: 2, absent: 1, marked: 3 }], ['d'])
  assert.equal(third[0].cells[1].pct, 66.7)
})
