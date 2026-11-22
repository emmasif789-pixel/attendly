import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { sortStudents } from './studentLogic.js'

export default function Students() {
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
  const panelRef = useRef(null)

  async function load() {
    const [s, st] = await Promise.all([
      supabase.from('sections').select('id,name,position').order('position'),
      supabase.from('students').select('id,name,roll_number,section_id'),
    ])
    if (s.error || st.error) {
      setMsg({ type: 'err', text: (s.error || st.error).message })
    } else {
      setSections(s.data)
      setStudents(sortStudents(st.data, s.data))
      setSectionId((cur) => cur || s.data[0]?.id || '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Bring the edit form into view (it sits above the list, which can be long on a phone).
  useEffect(() => {
    if (editing) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [editing?.id])

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
    else {
      if (editing?.id === st.id) setEditing(null)
      setMsg({ type: 'ok', text: `${st.name} deleted.` })
      await load()
    }
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

      {editing && (
        <div className="card edit-panel" ref={panelRef}>
          <h2>Edit student</h2>
          <div className="row">
            <input placeholder="Student name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input placeholder="Roll number" value={editing.roll} onChange={(e) => setEditing({ ...editing, roll: e.target.value })} />
            <select value={editing.sectionId} disabled={editing.count > 0} onChange={(e) => setEditing({ ...editing, sectionId: e.target.value })}>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {editing.count > 0 && (
            <p className="muted" style={{ marginBottom: 0 }}>
              Section is locked: this student has {editing.count} attendance record{editing.count === 1 ? '' : 's'}.
            </p>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button className="secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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
            <thead>
              <tr><th>Roll no.</th><th>Name</th><th className="hide-sm">Section</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className={editing?.id === s.id ? 'row-editing' : ''}>
                  <td>{s.roll_number}</td>
                  <td>
                    {s.name}
                    <span className="sub only-sm">{sectionName(s.section_id)}</span>
                  </td>
                  <td className="hide-sm">{sectionName(s.section_id)}</td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
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
