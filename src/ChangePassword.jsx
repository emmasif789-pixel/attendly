import { useState } from 'react'
import { supabase } from './supabase'
import { validatePassword } from './passwordLogic.js'

export default function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  function close() { setOpen(false); setPassword(''); setConfirm(''); setMsg(null) }

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    const problem = validatePassword(password, confirm)
    if (problem) { setMsg({ type: 'err', text: problem }); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMsg({ type: 'err', text: error.message })
    else { setMsg({ type: 'ok', text: 'Password changed. Use the new password next time you sign in.' }); setPassword(''); setConfirm('') }
    setBusy(false)
  }

  if (!open) {
    return (
      <div className="footer">
        <button className="link-btn" onClick={() => setOpen(true)}>Change password</button>
      </div>
    )
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginTop: 18 }}>
      <h2>Change password</h2>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      <div className="row stack-sm">
        <input type="password" autoComplete="new-password" placeholder="New password (10+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" autoComplete="new-password" placeholder="Repeat new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        <button type="button" className="secondary" onClick={close} disabled={busy}>Close</button>
      </div>
    </form>
  )
}
