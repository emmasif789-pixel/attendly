import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { lastNDates, todayBySection, weekBySection, rateTone } from './dashboardLogic'

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
      supabase.from('section_summary').select('section_id,section_name,total_students').order('position'),
      supabase.from('daily_summary').select('section_id,date,present,absent,marked,on_leave').gte('date', dates[dates.length - 1]),
      supabase.from('section_rate').select('section_id,present_records,marked_records,leave_records,percentage'),
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
  const week = weekBySection(data.sections, data.daily, data.dates)
  const dayHead = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return { weekday: new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }), day: d }
  }
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
                {t.total} students · <strong>{t.present}</strong> present · <strong>{t.absent}</strong> absent · <strong>{t.leave}</strong> on leave · <strong>{t.notMarked}</strong> not marked
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
                    <span className="muted">{r.present_records} present of {r.marked_records} counted days{r.leave_records > 0 ? ` · ${r.leave_records} on leave (not counted)` : ''}</span>
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
        <table className="heat">
          <thead>
            <tr>
              <th>Section</th>
              {week[0]?.days.map((d) => {
                const h = dayHead(d.date)
                return <th key={d.date} title={d.date}><span>{h.weekday}</span><b>{h.day}</b></th>
              })}
            </tr>
          </thead>
          <tbody>
            {week.map((sec) => (
              <tr key={sec.section_id}>
                <td className="heat-name">{sec.name}</td>
                {sec.days.map((d) => {
                  const tip = d.marked === 0
                    ? `${sec.name}, ${d.date}: attendance not taken`
                    : `${sec.name}, ${d.date}: ${d.present} of ${d.counted} present${d.pct !== null ? ` (${d.pct}%)` : ''}${d.leave ? `, ${d.leave} on leave` : ''}`
                  return (
                    <td key={d.date} title={tip}>
                      <span className={`heat-cell ${rateTone(d.pct)}`}>
                        {d.marked === 0 ? '–' : d.pct === null ? 'L' : Math.round(d.pct)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginBottom: 0 }}>
          Each cell is that day's attendance % (present ÷ present + absent). Green 85 and over, gold 75 to 84, red below 75.
          – means not taken, L means everyone on leave.
        </p>
      </div>

      <div className="card">
        <h2>Lowest attendance</h2>
        {data.low.length === 0 ? <p className="muted">No attendance recorded yet.</p> : (
          <table>
            <thead><tr><th>Roll no.</th><th>Name</th><th className="hide-sm">Section</th><th>Present / days</th><th>%</th></tr></thead>
            <tbody>
              {data.low.map((s) => (
                <tr key={s.student_id}>
                  <td>{s.roll_number}</td>
                  <td>{s.name}<span className="sub only-sm">{sectionName(s.section_id)}</span></td>
                  <td className="hide-sm">{sectionName(s.section_id)}</td>
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
