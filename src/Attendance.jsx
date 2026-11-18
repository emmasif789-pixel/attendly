import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function Attendance() {
  const [sections, setSections] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [students, setStudents] = useState([])
  const [saved, setSaved] = useState({}) // student_id -> status in database
  const [marks, setMarks] = useState({}) // student_id -> status on screen
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('sections').select('id,name').order('name').then(({ data, error }) => {
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

  async function save() {
    setMsg(null)
    const unmarked = students.filter((s) => !marks[s.id])
    if (unmarked.length) {
      setMsg({ type: 'err', text: `Mark every student first. Not marked: ${unmarked.map((s) => s.name).join(', ')}.` })
      return
    }
    setBusy(true)
    const rows = students.map((s) => ({
      student_id: s.id, section_id: sectionId, date, status: marks[s.id],
    }))
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' })
    if (error) setMsg({ type: 'err', text: error.message })
    else { setMsg({ type: 'ok', text: `Attendance saved for ${date}.` }); await load() }
    setBusy(false)
  }

  const dirty = students.some((s) => marks[s.id] !== saved[s.id])
  const savedCount = students.filter((s) => saved[s.id]).length

  return (
    <>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      <div className="card">
        <h2>Mark attendance</h2>
        <div className="row">
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? <p className="muted">Loading…</p> : students.length === 0 ? (
          <p className="muted">No students in this section. Register students first.</p>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              {savedCount === 0
                ? `No attendance saved for ${date} yet.`
                : `Saved attendance exists for ${date} (${savedCount} of ${students.length} students). You can edit and save again.`}
            </p>
            <table>
              <thead><tr><th>Roll no.</th><th>Name</th><th>Status</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.roll_number}</td>
                    <td>{s.name}</td>
                    <td>
                      <div className="row">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 12 }}>
              <button
                onClick={save}
                disabled={busy || !dirty}
                className={!dirty && !busy ? 'saved' : ''}
              >
                {busy ? 'Saving…' : !dirty && savedCount ? '✓ Saved' : savedCount ? 'Update attendance' : 'Save attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
