import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const byRoll = (a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true })

export default function Reports() {
  const [totals, setTotals] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [daily, setDaily] = useState([])
  const [day, setDay] = useState({ present: [], absent: [], notMarked: [] })
  const [students, setStudents] = useState([])
  const [history, setHistory] = useState(null) // { student, rows }
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('section_summary').select('section_id,section_name,total_students').order('section_name')
      .then(({ data, error }) => {
        if (error) { setMsg({ type: 'err', text: error.message }); return }
        setTotals(data)
        setSectionId(data[0]?.section_id || '')
      })
  }, [])

  async function load() {
    if (!sectionId) return
    setLoading(true)
    setMsg(null)
    setHistory(null)
    const [ds, st, at] = await Promise.all([
      supabase.from('daily_summary').select('date,present,absent,marked').eq('section_id', sectionId).order('date', { ascending: false }),
      supabase.from('student_summary').select('student_id,roll_number,name,present_days,absent_days,recorded_days,percentage').eq('section_id', sectionId),
      supabase.from('attendance').select('student_id,status').eq('section_id', sectionId).eq('date', date),
    ])
    const err = ds.error || st.error || at.error
    if (err) { setMsg({ type: 'err', text: err.message }); setLoading(false); return }
    const status = {}
    at.data.forEach((r) => { status[r.student_id] = r.status })
    const sorted = [...st.data].sort(byRoll)
    setDaily(ds.data)
    setStudents(sorted)
    setDay({
      present: sorted.filter((s) => status[s.student_id] === 'present'),
      absent: sorted.filter((s) => status[s.student_id] === 'absent'),
      notMarked: sorted.filter((s) => !status[s.student_id]),
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [sectionId, date])

  async function openHistory(s) {
    const { data, error } = await supabase.from('attendance').select('date,status')
      .eq('student_id', s.student_id).order('date', { ascending: false })
    if (error) setMsg({ type: 'err', text: error.message })
    else setHistory({ student: s, rows: data })
  }

  const list = (arr) => arr.length ? arr.map((s) => `${s.roll_number} – ${s.name}`).map((t) => <div key={t}>{t}</div>) : <span className="muted">None</span>

  return (
    <>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

      <div className="card">
        <h2>Total students per section</h2>
        <div className="stats">
          {totals.map((t) => (
            <div className="stat" key={t.section_id}>
              <span className="muted">{t.section_name}</span>
              <b>{t.total_students}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Report filters</h2>
        <div className="row">
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {totals.map((t) => <option key={t.section_id} value={t.section_id}>{t.section_name}</option>)}
          </select>
          <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </div>

      {loading ? <p className="muted">Loading…</p> : (
        <>
          <div className="card">
            <h2>Present and absent on {date}</h2>
            {day.present.length + day.absent.length === 0 ? (
              <p className="muted">No attendance saved for this section on this date.</p>
            ) : (
              <>
                <div className="stats" style={{ marginBottom: 12 }}>
                  <div className="stat"><span className="muted">Present</span><b>{day.present.length}</b></div>
                  <div className="stat"><span className="muted">Absent</span><b>{day.absent.length}</b></div>
                  <div className="stat"><span className="muted">Not marked</span><b>{day.notMarked.length}</b></div>
                </div>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 200 }}><strong>Present</strong>{list(day.present)}</div>
                  <div style={{ flex: 1, minWidth: 200 }}><strong>Absent</strong>{list(day.absent)}</div>
                </div>
                {day.notMarked.length > 0 && (
                  <div style={{ marginTop: 12 }}><strong>Not marked</strong>{list(day.notMarked)}</div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h2>Date-wise records</h2>
            {daily.length === 0 ? <p className="muted">No attendance saved yet.</p> : (
              <table>
                <thead><tr><th>Date</th><th>Present</th><th>Absent</th><th>Total marked</th></tr></thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.date}><td>{d.date}</td><td>{d.present}</td><td>{d.absent}</td><td>{d.marked}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2>Student attendance</h2>
            {students.length === 0 ? <p className="muted">No students in this section.</p> : (
              <table>
                <thead><tr><th>Roll no.</th><th>Name</th><th>Present</th><th>Absent</th><th>Days</th><th>%</th><th></th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.student_id}>
                      <td>{s.roll_number}</td><td>{s.name}</td>
                      <td>{s.present_days}</td><td>{s.absent_days}</td><td>{s.recorded_days}</td>
                      <td>{s.percentage === null ? '–' : `${s.percentage}%`}</td>
                      <td><button className="secondary" onClick={() => openHistory(s)}>History</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted" style={{ marginBottom: 0 }}>% = present days ÷ days with a saved record for that student.</p>
          </div>

          {history && (
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>History: {history.student.roll_number} – {history.student.name}</h2>
                <button className="secondary" onClick={() => setHistory(null)}>Close</button>
              </div>
              {history.rows.length === 0 ? <p className="muted">No records yet.</p> : (
                <table>
                  <thead><tr><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {history.rows.map((r) => (
                      <tr key={r.date}><td>{r.date}</td><td>{r.status === 'present' ? 'Present' : 'Absent'}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
