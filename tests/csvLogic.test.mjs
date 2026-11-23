import test from 'node:test'
import assert from 'node:assert/strict'
import { BOM, neutralizeFormula, escapeCell, toCsv, safeFilename } from '../src/csvLogic.js'

test('plain values are not quoted', () => {
  assert.equal(escapeCell('Ayesha Khan'), 'Ayesha Khan')
  assert.equal(escapeCell(7), '7')
  assert.equal(escapeCell(null), '')
  assert.equal(escapeCell(undefined), '')
})

test('commas, quotes and line breaks are quoted and escaped', () => {
  assert.equal(escapeCell('Khan, Ayesha'), '"Khan, Ayesha"')
  assert.equal(escapeCell('say "hi"'), '"say ""hi"""')
  assert.equal(escapeCell('two\nlines'), '"two\nlines"')
})

test('formula injection is neutralised', () => {
  assert.equal(neutralizeFormula('=SUM(1+1)'), "'=SUM(1+1)")
  assert.equal(neutralizeFormula('+1'), "'+1")
  assert.equal(neutralizeFormula('-1'), "'-1")
  assert.equal(neutralizeFormula('@cmd'), "'@cmd")
  assert.equal(neutralizeFormula('\tcmd'), "'\tcmd")
  assert.equal(neutralizeFormula('Normal = fine'), 'Normal = fine')
  assert.equal(escapeCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`)
})

test('toCsv has BOM, header, CRLF rows and a final newline', () => {
  const csv = toCsv(
    [{ a: '2026-11-21', b: 'Ali, Raza', c: 'Present' }, { a: '2026-11-20', b: '=x', c: 'Absent' }],
    [{ header: 'Date', key: 'a' }, { header: 'Name', key: 'b' }, { header: 'Status', key: 'c' }]
  )
  assert.equal(csv.startsWith(BOM), true)
  assert.equal(csv.slice(1), `Date,Name,Status\r\n2026-11-21,"Ali, Raza",Present\r\n2026-11-20,'=x,Absent\r\n`)
})

test('no rows gives just the header', () => {
  assert.equal(toCsv([], [{ header: 'Date', key: 'a' }]).slice(1), 'Date\r\n')
})

test('unicode names survive', () => {
  assert.match(toCsv([{ n: 'زینب علی' }], [{ header: 'Name', key: 'n' }]), /زینب علی/)
})

test('safeFilename removes unsafe characters', () => {
  assert.equal(safeFilename(['attendance', 'FSC Pre-Medical', '2026-11-01', 'to', '2026-11-21']), 'attendance_FSC-Pre-Medical_2026-11-01_to_2026-11-21.csv')
  assert.equal(safeFilename(['../../etc/passwd']), 'etc-passwd.csv')
  assert.equal(safeFilename([null, '']), 'export.csv')
})
