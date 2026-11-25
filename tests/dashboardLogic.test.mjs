import test from 'node:test'
import assert from 'node:assert/strict'
import { lastNDates, takenStatus, todayBySection, weekGrid, weekBySection, rateTone } from '../src/dashboardLogic.js'

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
  assert.deepEqual(t[0], { section_id: 'med', name: 'FSC Pre-Medical', total: 2, present: 1, absent: 1, leave: 0, notMarked: 0, status: 'full' })
  assert.deepEqual(t[1], { section_id: 'eng', name: 'FSC Pre-Engineering', total: 1, present: 0, absent: 0, leave: 0, notMarked: 1, status: 'none' })
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

test('leave counts as taken and is excused from the percentage', () => {
  const secs = [{ section_id: 'med', section_name: 'M', total_students: 4 }]
  const d = [{ section_id: 'med', date: 'd1', present: 2, absent: 1, marked: 4, on_leave: 1 }]
  const t = todayBySection(secs, d, 'd1')
  assert.deepEqual([t[0].present, t[0].absent, t[0].leave, t[0].notMarked, t[0].status], [2, 1, 1, 0, 'full'])
  const g = weekGrid(secs, d, ['d1'])
  assert.equal(g[0].cells[0].counted, 3)
  assert.equal(g[0].cells[0].pct, 66.7) // 2 / (2 + 1), the leave day is not counted
})

test('a day where everyone is on leave has no percentage', () => {
  const secs = [{ section_id: 'med', section_name: 'M', total_students: 2 }]
  const g = weekGrid(secs, [{ section_id: 'med', date: 'd1', present: 0, absent: 0, marked: 2, on_leave: 2 }], ['d1'])
  assert.equal(g[0].cells[0].pct, null)
  assert.equal(g[0].cells[0].leave, 2)
  assert.equal(todayBySection(secs, [{ section_id: 'med', date: 'd1', present: 0, absent: 0, marked: 2, on_leave: 2 }], 'd1')[0].status, 'full')
})

test('weekBySection: one row per section, oldest day first, same numbers as the grid', () => {
  const secs = [
    { section_id: 'a', section_name: 'A', total_students: 2 },
    { section_id: 'b', section_name: 'B', total_students: 1 },
  ]
  const d = [
    { section_id: 'a', date: '2026-11-21', present: 2, absent: 0, marked: 2, on_leave: 0 },
    { section_id: 'a', date: '2026-11-20', present: 1, absent: 1, marked: 2, on_leave: 0 },
    { section_id: 'b', date: '2026-11-20', present: 0, absent: 0, marked: 1, on_leave: 1 },
  ]
  const rows = weekBySection(secs, d, ['2026-11-21', '2026-11-20', '2026-11-19'])
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0].days.map((x) => x.date), ['2026-11-19', '2026-11-20', '2026-11-21'])
  assert.deepEqual(rows[0].days.map((x) => x.pct), [null, 50, 100])
  assert.deepEqual(rows[1].days.map((x) => [x.pct, x.leave, x.marked]), [[null, 0, 0], [null, 1, 1], [null, 0, 0]])
  assert.equal(rows[0].name, 'A')
})

test('rateTone bands', () => {
  assert.equal(rateTone(null), 'none')
  assert.equal(rateTone(100), 'good')
  assert.equal(rateTone(85), 'good')
  assert.equal(rateTone(84.9), 'ok')
  assert.equal(rateTone(75), 'ok')
  assert.equal(rateTone(74.9), 'low')
  assert.equal(rateTone(0), 'low')
})
