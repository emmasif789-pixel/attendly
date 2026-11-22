import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Attendance from './Attendance.jsx'
import Reports from './Reports.jsx'
import Dashboard from './Dashboard.jsx'
import History from './History.jsx'
import Students from './Students.jsx'
import ChangePassword from './ChangePassword.jsx'

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
        <ChangePassword />
      </div>
    </>
  )
}
