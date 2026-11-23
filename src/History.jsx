import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import {
  PAGE_SIZE, sanitizeSearch, pageRange, lastPage, pageLabel, validateRange, lastDaysRange, presentRate,
} from './historyLogic.js'
import { toCsv, safeFilename } from './csvLogic.js'

function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// One place that applies the filters, used by both the list and the CSV export.
function applyFilters(q, { from, to, sectionId, status, search }) {
  q = q.gte('date', from).lte('date', to)
  if (sectionId !== 'all') q = q.eq('section_id', sectionId)
  if (status !== 'all') q = q.eq('status', status)
  if (search) q = q.or(`student_name.ilike.*${search}*,roll_number.ilike.*${search}*`)
  return q
}

const EXPORT_PAGE = 1000
const EXPORT_MAX = 50000
const EXPORT_COLUMNS = [
  { header: 'Date', key: 'date' },
  { header: 'Roll number', key: 'roll_number' },
  { header: 'Name', key: 'student_name' },
  { header: 'Section', key: 'section_name' },
  { header: 'Status', key: 'status' },
]

export default function History() {
  const today = todayLocal()
  const initial = lastDaysRange(today, 30)

  const [sections, setSections] = useState([])
  const [sectionId, setSectionId] = useState('all')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [status, setStatus] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [present, setPresent] = useState(0)
  const [absent, setAbsent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const requestId = useRef(0)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    supabase.from('sections').select('id,name').order('position').then(({ data }) => data && setSections(data))
  }, [])

  // Wait a moment after typing before searching.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(sanitizeSearch(searchInput)); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const rangeError = validateRange(from, to)

  useEffect(() => {
    if (rangeError) { setMsg({ type: 'err', text: rangeError }); setRows([]); setTotal(0); setPresent(0); setAbsent(0); setLoading(false); return }
    setMsg(null)
    setLoading(true)
    const id = ++requestId.current

    const filters = { from, to, sectionId, status, search }
    const filtered = (q) => applyFilters(q, filters)
    const [a, b] = pageRange(page)

    Promise.all([
      filtered(supabase.from('attendance_history').select('id,date,status,section_name,roll_number,student_name', { count: 'exact' }))
        .order('date', { ascending: false }).order('section_position').order('roll_sort').range(a, b),
      filtered(supabase.from('attendance_history').select('id', { count: 'exact', head: true })).eq('status', 'present'),
      filtered(supabase.from('attendance_history').select('id', { count: 'exact', head: true })).eq('status', 'absent'),
    ]).then(([list, p, ab]) => {
      if (id !== requestId.current) return // a newer request replaced this one
      const err = list.error || p.error || ab.error
      if (err) { setMsg({ type: 'err', text: err.message }); setLoading(false); return }
      if (list.data.length === 0 && list.count > 0 && page > 0) { setPage(lastPage(list.count)); return }
      setRows(list.data)
      setTotal(list.count ?? 0)
      setPresent(p.count ?? 0)
      setAbsent(ab.count ?? 0)
      setLoading(false)
    })
  }, [sectionId, from, to, status, search, page])

  async function exportCsv() {
    setMsg(null)
    setExporting(true)
    const filters = { from, to, sectionId, status, search }
    const all = []
    for (let i = 0; ; i++) {
      const { data, error } = await applyFilters(
        supabase.from('attendance_history').select('date,roll_number,student_name,section_name,status'), filters)
        .order('date', { ascending: false }).order('section_position').order('roll_sort')
        .range(i * EXPORT_PAGE, i * EXPORT_PAGE + EXPORT_PAGE - 1)
      if (error) { setMsg({ type: 'err', text: error.message }); setExporting(false); return }
      all.push(...data)
      if (data.length < EXPORT_PAGE) break
      if (all.length >= EXPORT_MAX) {
        setMsg({ type: 'err', text: `Too many records to export at once (over ${EXPORT_MAX}). Narrow the dates and try again.` })
        setExporting(false)
        return
      }
    }
    if (all.length !== total) {
      setMsg({ type: 'err', text: `Export stopped: got ${all.length} of ${total} records. Please try again.` })
      setExporting(false)
      return
    }
    const rows = all.map((r) => ({ ...r, status: r.status === 'present' ? 'Present' : 'Absent' }))
    const sectionLabel = sectionId === 'all' ? '' : sections.find((x) => x.id === sectionId)?.name
    const name = safeFilename(['attendance', sectionLabel, status === 'all' ? '' : status, from, 'to', to])
    const blob = new Blob([toCsv(rows, EXPORT_COLUMNS)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setMsg({ type: 'ok', text: `Exported ${rows.length} record${rows.length === 1 ? '' : 's'} to ${name}.` })
    setExporting(false)
  }

  function preset(days) {
    const r = lastDaysRange(today, days)
    setFrom(r.from); setTo(r.to); setPage(0)
  }

  function reset() {
    const r = lastDaysRange(today, 30)
    setSectionId('all'); setStatus('all'); setSearchInput(''); setSearch(''); setFrom(r.from); setTo(r.to); setPage(0)
  }

  const rate = presentRate(present, absent)
  const last = lastPage(total)

  return (
    <>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

      <div className="card">
        <h2>Filter attendance history</h2>
        <div className="row stack-sm" style={{ marginBottom: 10 }}>
          <select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(0) }}>
            <option value="all">All sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
            <option value="all">All statuses</option>
            <option value="present">Present only</option>
            <option value="absent">Absent only</option>
          </select>
          <input placeholder="Search name or roll number" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <div className="date-grid">
          <label className="field">
            <span className="muted">From</span>
            <input type="date" value={from} max={to || today} onChange={(e) => { setFrom(e.target.value); setPage(0) }} />
          </label>
          <label className="field">
            <span className="muted">To</span>
            <input type="date" value={to} max={today} onChange={(e) => { setTo(e.target.value); setPage(0) }} />
          </label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="secondary" onClick={() => preset(7)}>Last 7 days</button>
          <button className="secondary" onClick={() => preset(30)}>Last 30 days</button>
          <button className="secondary" onClick={() => { setFrom('2000-01-01'); setTo(today); setPage(0) }}>All time</button>
          <button className="secondary" onClick={reset}>Reset filters</button>
          <button onClick={exportCsv} disabled={exporting || loading || !!rangeError || total === 0}>
            {exporting ? 'Exporting…' : `Export CSV (${total})`}
          </button>
        </div>
      </div>

      <div className="stats" style={{ marginBottom: 18 }}>
        <div className="stat"><span className="muted">Records</span><b>{total}</b></div>
        <div className="stat"><span className="muted">Present</span><b>{present}</b></div>
        <div className="stat"><span className="muted">Absent</span><b>{absent}</b></div>
        <div className="stat"><span className="muted">Present rate</span><b>{rate === null ? '–' : `${rate}%`}</b></div>
      </div>

      <div className="card">
        {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? (
          <p className="muted">{rangeError ? '' : 'No attendance records match these filters.'}</p>
        ) : (
          <>
            <table>
              <thead><tr><th>Date</th><th>Roll no.</th><th>Name</th><th className="hide-sm">Section</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{r.date}</td>
                    <td>{r.roll_number}</td>
                    <td>{r.student_name}<span className="sub only-sm">{r.section_name}</span></td>
                    <td className="hide-sm">{r.section_name}</td>
                    <td><span className={r.status === 'present' ? 'badge ok' : 'badge bad'}>{r.status === 'present' ? 'Present' : 'Absent'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">{pageLabel(page, PAGE_SIZE, total)}</span>
              {total > PAGE_SIZE && (
                <div className="row">
                  <button className="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                  <button className="secondary" disabled={page >= last} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
