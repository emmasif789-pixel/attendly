import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Attendance from './Attendance.jsx'
import Reports from './Reports.jsx'
import Dashboard from './Dashboard.jsx'
import History from './History.jsx'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="crest big">A</div>
        <h1>Attendly</h1>
        <p className="muted">Administrator sign in</p>
        {error && <div className="msg err">{error}</div>}
        <div className="row">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}

function Students() {
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [roll, setRoll] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [filter, setFilter] = useState('all')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { id, name, roll, sectionId, count }
  const [saving, setSaving] = useState(false)

  async function load() {
    const [s, st] = await Promise.all([
      supabase.from('sections').select('id,name').order('name'),
      supabase.from('students').select('id,name,roll_number,section_id').order('roll_number'),
    ])
    if (s.error || st.error) {
      setMsg({ type: 'err', text: (s.error || st.error).message })
    } else {
      setSections(s.data)
      setStudents(st.data)
      setSectionId((cur) => cur || s.data[0]?.id || '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function register(e) {
    e.preventDefault()
    setMsg(null)
    const n = name.trim()
    const r = roll.trim()
    if (!n || !r || !sectionId) {
      setMsg({ type: 'err', text: 'Name, roll number and section are required.' })
      return
    }
    setBusy(true)
    const { error } = await supabase
      .from('students')
      .insert({ name: n, roll_number: r, section_id: sectionId })
    if (error) {
      setMsg({
        type: 'err',
        text: error.code === '23505' ? `Roll number ${r} is already registered.` : error.message,
      })
    } else {
      setName('')
      setRoll('')
      setMsg({ type: 'ok', text: `${n} registered.` })
      await load()
    }
    setBusy(false)
  }

  async function remove(st) {
    const { count, error: countError } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', st.id)
    if (countError) { setMsg({ type: 'err', text: countError.message }); return }
    const extra = count
      ? ` This will also permanently delete ${count} attendance record${count === 1 ? '' : 's'}.`
      : ''
    if (!window.confirm(`Delete ${st.name} (${st.roll_number})?${extra} This cannot be undone.`)) return
    const { error } = await supabase.from('students').delete().eq('id', st.id)
    if (error) setMsg({ type: 'err', text: error.message })
    else { setMsg({ type: 'ok', text: `${st.name} deleted.` }); await load() }
  }

  async function startEdit(st) {
    setMsg(null)
    const { count, error } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', st.id)
    if (error) { setMsg({ type: 'err', text: error.message }); return }
    setEditing({ id: st.id, name: st.name, roll: st.roll_number, sectionId: st.section_id, count: count || 0 })
  }

  async function saveEdit() {
    setMsg(null)
    const n = editing.name.trim()
    const r = editing.roll.trim()
    if (!n || !r) {
      setMsg({ type: 'err', text: 'Name and roll number cannot be empty.' })
      return
    }
    const patch = { name: n, roll_number: r }
    if (editing.count === 0) patch.section_id = editing.sectionId
    setSaving(true)
    const { error } = await supabase.from('students').update(patch).eq('id', editing.id)
    if (error) {
      let text = error.message
      if (error.code === '23505') text = `Roll number ${r} is already used by another student.`
      else if (error.code === '23503') text = 'This student now has attendance records, so their section cannot be changed.'
      setMsg({ type: 'err', text })
    } else {
      setMsg({ type: 'ok', text: `${n} updated.` })
      setEditing(null)
      await load()
    }
    setSaving(false)
  }

  const sectionName = (id) => sections.find((s) => s.id === id)?.name ?? ''
  const shown = filter === 'all' ? students : students.filter((s) => s.section_id === filter)

  if (loading) return <p className="muted">Loading…</p>

  return (
    <>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

      <div className="card">
        <h2>Sections</h2>
        <div className="stats">
          {sections.map((s) => (
            <div className="stat" key={s.id}>
              <span className="muted">{s.name}</span>
              <b>{students.filter((x) => x.section_id === s.id).length}</b>
              <span className="muted">students</span>
            </div>
          ))}
        </div>
      </div>

      <form className="card" onSubmit={register}>
        <h2>Register student</h2>
        <div className="row">
          <input placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Roll number" value={roll} onChange={(e) => setRoll(e.target.value)} />
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button disabled={busy}>{busy ? 'Saving…' : 'Register'}</button>
        </div>
      </form>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Students ({shown.length})</h2>
          <select style={{ flex: 'none' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {shown.length === 0 ? (
          <p className="muted">No students registered yet.</p>
        ) : (
          <table>
            <thead><tr><th>Roll no.</th><th>Name</th><th>Section</th><th></th></tr></thead>
            <tbody>
              {shown.map((s) => editing?.id === s.id ? (
                <tr key={s.id}>
                  <td><input style={{ minWidth: 80 }} value={editing.roll} onChange={(e) => setEditing({ ...editing, roll: e.target.value })} /></td>
                  <td><input style={{ minWidth: 120 }} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></td>
                  <td>
                    <select style={{ minWidth: 150 }} value={editing.sectionId} disabled={editing.count > 0}
                      onChange={(e) => setEditing({ ...editing, sectionId: e.target.value })}>
                      {sections.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    {editing.count > 0 && (
                      <div className="muted">Section locked: {editing.count} attendance record{editing.count === 1 ? '' : 's'}.</div>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                      <button className="secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td>{s.roll_number}</td>
                  <td>{s.name}</td>
                  <td>{sectionName(s.section_id)}</td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <button className="secondary" onClick={() => startEdit(s)}>Edit</button>
                      <button className="danger" onClick={() => remove(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState('dashboard')
  const [attendanceDirty, setAttendanceDirty] = useState(false)
  const [admin, setAdmin] = useState(undefined) // undefined = checking, true/false = result

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setAdmin(undefined); return }
    setAdmin(undefined)
    supabase.rpc('is_admin').then(({ data, error }) => setAdmin(!error && data === true))
  }, [session?.user?.id])

  function changeTab(next) {
    if (tab === 'attendance' && next !== 'attendance' && attendanceDirty &&
        !window.confirm('You have unsaved attendance changes. Discard them?')) return
    setTab(next)
  }

  if (session === undefined) return <div className="login-wrap"><p className="muted">Loading…</p></div>
  if (!session) return <Login />
  if (admin === undefined) return <div className="login-wrap"><p className="muted">Checking access…</p></div>
  if (admin === false) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <div className="crest big">A</div>
          <h1>Access denied</h1>
          <p className="muted">This account is not an Attendly administrator.</p>
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="crest">A</div>
            <div>
              <h1>Attendly</h1>
              <small>College attendance</small>
            </div>
          </div>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
      <div className="wrap">
        <div className="tabs">
          <button className={tab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => changeTab('dashboard')}>Dashboard</button>
          <button className={tab === 'students' ? 'tab active' : 'tab'} onClick={() => changeTab('students')}>Students</button>
          <button className={tab === 'attendance' ? 'tab active' : 'tab'} onClick={() => changeTab('attendance')}>Attendance</button>
          <button className={tab === 'reports' ? 'tab active' : 'tab'} onClick={() => changeTab('reports')}>Reports</button>
          <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => changeTab('history')}>History</button>
        </div>
        {tab === 'dashboard' ? <Dashboard /> : tab === 'students' ? <Students /> : tab === 'attendance' ? <Attendance onDirtyChange={setAttendanceDirty} /> : tab === 'reports' ? <Reports /> : <History />}
      </div>
    </>
  )
}
