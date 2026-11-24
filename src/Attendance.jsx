import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { isDirty, unmarkedStudents, changedRows, countMarks, markRemaining } from './attendanceLogic'

function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const DISCARD = 'You have unsaved attendance changes. Discard them?'

export default function Attendance({ onDirtyChange }) {
  const [sections, setSections] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [students, setStudents] = useState([])
  const [saved, setSaved] = useState({}) // student_id -> status in database
  const [marks, setMarks] = useState({}) // student_id -> status on screen
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const dirty = isDirty(students, marks, saved)

  // Tell the parent about unsaved changes so switching tabs can warn too.
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty])
  useEffect(() => () => onDirtyChange?.(false), [])

  // Warn when closing or reloading the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    supabase.from('sections').select('id,name').order('position').then(({ data, error }) => {
      if (error) setMsg({ type: 'err', text: error.message })
      else { setSections(data); setSectionId(data[0]?.id || '') }
    })
  }, [])

  async function load() {
    if (!sectionId || !date) return
    setLoading(true)
    setMsg(null)
    const [st, at] = await Promise.all([
      supabase.from('students').select('id,name,roll_number').eq('section_id', sectionId),
      supabase.from('attendance').select('student_id,status').eq('section_id', sectionId).eq('date', date),
    ])
    if (st.error || at.error) {
      setMsg({ type: 'err', text: (st.error || at.error).message })
    } else {
      const sorted = [...st.data].sort((a, b) =>
        a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true }))
      const map = {}
      at.data.forEach((r) => { map[r.student_id] = r.status })
      setStudents(sorted)
      setSaved(map)
      setMarks(map)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [sectionId, date])

  function guarded(change) {
    if (dirty && !window.confirm(DISCARD)) return
    change()
  }

  async function save() {
    setMsg(null)
    const unmarked = unmarkedStudents(students, marks)
    if (unmarked.length) {
      setMsg({ type: 'err', text: `Mark every student first. Not marked: ${unmarked.map((s) => s.name).join(', ')}.` })
      return
    }
    const rows = changedRows(students, marks, saved, sectionId, date)
    if (rows.length === 0) return
    setBusy(true)
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' })
    if (error) setMsg({ type: 'err', text: error.message })
    else { setMsg({ type: 'ok', text: `Attendance saved for ${date}.` }); await load() }
    setBusy(false)
  }

  const savedCount = students.filter((s) => saved[s.id]).length
  const counts = countMarks(students, marks)

  return (
    <>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      <div className="card">
        <h2>Mark attendance</h2>
        <div className="row stack-sm">
          <select value={sectionId} onChange={(e) => guarded(() => setSectionId(e.target.value))}>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => e.target.value && guarded(() => setDate(e.target.value))}
          />
        </div>
      </div>

      <div className="card flush">
        {loading ? <p className="muted">Loading…</p> : students.length === 0 ? (
          <p className="muted">No students in this section. Register students first.</p>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              {savedCount === 0
                ? `No attendance saved for ${date} yet.`
                : `Saved attendance exists for ${date} (${savedCount} of ${students.length} students). You can edit and save again.`}
            </p>
            {dirty && <div className="msg err" style={{ marginBottom: 12 }}>You have unsaved changes.</div>}
            {counts.unmarked > 0 && (
              <div className="row" style={{ marginBottom: 10 }}>
                <button type="button" className="secondary" onClick={() => setMarks(markRemaining(students, marks, 'present'))}>
                  Mark remaining {counts.unmarked} as Present
                </button>
              </div>
            )}
            <div className="table-wrap">
              <table className="att-table">
                <thead><tr><th>Roll no.</th><th>Name</th><th>Status</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.roll_number}</td>
                      <td>{s.name}</td>
                      <td>
                        <div className="row" style={{ flexWrap: 'nowrap' }}>
                          <button
                            type="button"
                            className={marks[s.id] === 'present' ? 'present-on' : 'secondary'}
                            onClick={() => setMarks({ ...marks, [s.id]: 'present' })}
                          >Present</button>
                          <button
                            type="button"
                            className={marks[s.id] === 'absent' ? 'danger-on' : 'secondary'}
                            onClick={() => setMarks({ ...marks, [s.id]: 'absent' })}
                          >Absent</button>
                          <button
                            type="button"
                            className={marks[s.id] === 'leave' ? 'leave-on' : 'secondary'}
                            onClick={() => setMarks({ ...marks, [s.id]: 'leave' })}
                          >Leave</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sticky-bar">
              <div className="row" style={{ gap: 6 }}>
                <span className="badge ok">Present {counts.present}</span>
                <span className="badge bad">Absent {counts.absent}</span>
                <span className="badge leave">Leave {counts.leave}</span>
                <span className="badge">Unmarked {counts.unmarked}</span>
              </div>
              <button
                onClick={save}
                disabled={busy || (savedCount > 0 && !dirty)}
                className={savedCount > 0 && !dirty && !busy ? 'saved' : ''}
              >
                {busy ? 'Saving…' : savedCount > 0 && !dirty ? '✓ Saved' : savedCount > 0 ? 'Update attendance' : 'Save attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
