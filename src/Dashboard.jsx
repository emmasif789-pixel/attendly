import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { lastNDates, todayBySection, weekGrid } from './dashboardLogic'

function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const STATUS = {
  full: { label: 'Attendance taken', cls: 'badge ok' },
  partial: { label: 'Partly taken', cls: 'badge warn' },
  none: { label: 'Not taken yet', cls: 'badge bad' },
  empty: { label: 'No students', cls: 'badge' },
}

export default function Dashboard() {
  const today = todayLocal()
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const dates = lastNDates(today, 7)
    Promise.all([
      supabase.from('section_summary').select('section_id,section_name,total_students').order('section_name'),
      supabase.from('daily_summary').select('section_id,date,present,absent,marked').gte('date', dates[dates.length - 1]),
      supabase.from('section_rate').select('section_id,present_records,marked_records,percentage'),
      supabase.from('student_summary').select('student_id,section_id,roll_number,name,present_days,recorded_days,percentage')
        .gt('recorded_days', 0).order('percentage', { ascending: true }).limit(5),
    ]).then(([sec, daily, rate, low]) => {
      const err = sec.error || daily.error || rate.error || low.error
      if (err) { setMsg({ type: 'err', text: err.message }); return }
      setData({ sections: sec.data, daily: daily.data, rate: rate.data, low: low.data, dates })
    })
  }, [])

  if (msg) return <div className={`msg ${msg.type}`}>{msg.text}</div>
  if (!data) return <p className="muted">Loading…</p>

  const todayRows = todayBySection(data.sections, data.daily, today)
  const grid = weekGrid(data.sections, data.daily, data.dates)
  const sectionName = (id) => data.sections.find((s) => s.section_id === id)?.section_name ?? ''
  const rateOf = (id) => data.rate.find((r) => r.section_id === id)

  return (
    <>
      <div className="card">
        <h2>Today · {today}</h2>
        <div className="stats">
          {todayRows.map((t) => (
            <div className="stat" key={t.section_id}>
              <span className="muted">{t.name}</span>
              <div style={{ margin: '6px 0' }}><span className={STATUS[t.status].cls}>{STATUS[t.status].label}</span></div>
              <div className="muted">
                {t.total} students · <strong>{t.present}</strong> present · <strong>{t.absent}</strong> absent · <strong>{t.notMarked}</strong> not marked
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Overall attendance rate</h2>
        <div className="stats">
          {data.sections.map((s) => {
            const r = rateOf(s.section_id)
            return (
              <div className="stat" key={s.section_id}>
                <span className="muted">{s.section_name}</span>
                {r && r.marked_records > 0 ? (
                  <>
                    <b>{r.percentage}%</b>
                    <span className="muted">{r.present_records} present of {r.marked_records} records</span>
                  </>
                ) : (
                  <>
                    <b>–</b>
                    <span className="muted">No attendance recorded yet</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h2>Last 7 days</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {data.sections.map((s) => <th key={s.section_id}>{s.section_name}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                {row.cells.map((c) => (
                  <td key={c.section_id}>
                    {c.marked === 0 ? <span className="muted">–</span> : (
                      <>
                        {c.present}/{c.marked} · <strong>{c.pct}%</strong>
                        <div className="bar"><div style={{ width: `${c.pct}%` }} /></div>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Lowest attendance</h2>
        {data.low.length === 0 ? <p className="muted">No attendance recorded yet.</p> : (
          <table>
            <thead><tr><th>Roll no.</th><th>Name</th><th>Section</th><th>Present / days</th><th>%</th></tr></thead>
            <tbody>
              {data.low.map((s) => (
                <tr key={s.student_id}>
                  <td>{s.roll_number}</td>
                  <td>{s.name}</td>
                  <td>{sectionName(s.section_id)}</td>
                  <td>{s.present_days} / {s.recorded_days}</td>
                  <td><strong>{s.percentage}%</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
