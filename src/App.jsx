import { useEffect, useState } from 'react'
import { supabase } from './supabase'

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
    <div className="wrap" style={{ maxWidth: 380 }}>
      <h1 style={{ marginBottom: 16 }}>Attendly – Admin Login</h1>
      <form className="card" onSubmit={submit}>
        {error && <div className="msg err">{error}</div>}
        <div className="row" style={{ flexDirection: 'column' }}>
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
    if (!window.confirm(`Delete ${st.name} (${st.roll_number})? This cannot be undone.`)) return
    const { error } = await supabase.from('students').delete().eq('id', st.id)
    if (error) setMsg({ type: 'err', text: error.message })
    else { setMsg({ type: 'ok', text: `${st.name} deleted.` }); await load() }
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
              {shown.map((s) => (
                <tr key={s.id}>
                  <td>{s.roll_number}</td>
                  <td>{s.name}</td>
                  <td>{sectionName(s.section_id)}</td>
                  <td><button className="danger" onClick={() => remove(s)}>Delete</button></td>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="wrap"><p className="muted">Loading…</p></div>
  if (!session) return <Login />

  return (
    <div className="wrap">
      <header>
        <h1>Attendly</h1>
        <button className="secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <Students />
    </div>
  )
}
