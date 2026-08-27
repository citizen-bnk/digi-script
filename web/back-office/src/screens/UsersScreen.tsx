import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async, StatusPill, formatDate } from '../components/Async'

const ROLES = ['SUPER_USER', 'SUPERVISOR', 'TEACHER', 'SUPPORT', 'PARENT']

/**
 * User Management (Application Spec sections 4 and 5): the staff directory
 * with invite and deactivate. Bulk CSV upload and password reset are in the
 * spec but have no endpoint yet, so they are absent rather than inert.
 */
export default function UsersScreen() {
  const { activeSchool } = useSchool()
  const navigate = useNavigate()
  const schoolId = activeSchool?.id
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'TEACHER', assignedClassName: '' })

  const users = useAsync(() => (schoolId ? api.listUsers(schoolId) : Promise.resolve(null)), [schoolId])

  async function invite(e: FormEvent) {
    e.preventDefault()
    if (!schoolId) return
    setBusy(true)
    setError(null)
    try {
      await api.createUser({
        schoolId,
        name: form.name,
        email: form.email,
        role: form.role,
        temporaryPassword: 'Password123!',
        ...(form.assignedClassName ? { assignedClassName: form.assignedClassName } : {}),
      })
      setForm({ name: '', email: '', role: 'TEACHER', assignedClassName: '' })
      setShowInvite(false)
      users.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the user')
    } finally {
      setBusy(false)
    }
  }

  async function deactivate(userId: string) {
    if (!schoolId) return
    setError(null)
    try {
      await api.deactivateUser(userId, schoolId)
      users.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not deactivate the user')
    }
  }

  if (!schoolId) return <div className="notice">No school selected.</div>

  return (
    <>
      <div className="page-head">
        <h1>User Management</h1>
        <p>{activeSchool?.name}</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filter-bar">
        <button type="button" className="primary" onClick={() => setShowInvite((open) => !open)}>
          {showInvite ? 'Cancel' : 'Add staff member'}
        </button>
      </div>

      {showInvite && (
        <form className="card card-pad" style={{ marginBottom: 18, maxWidth: 520 }} onSubmit={invite}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          {(form.role === 'TEACHER' || form.role === 'SUPERVISOR') && (
            <div className="field">
              <label htmlFor="class">Assigned class</label>
              <input
                id="class"
                placeholder="e.g. Grade 1A"
                value={form.assignedClassName}
                onChange={(e) => setForm({ ...form, assignedClassName: e.target.value })}
              />
              <p className="cell-muted" style={{ marginTop: 6, marginBottom: 0 }}>
                Leaving this blank gives school-wide access instead of class-scoped access.
              </p>
            </div>
          )}
          <p className="cell-muted">
            The account is created with the temporary password <code>Password123!</code> — there is no
            password-reset email endpoint yet.
          </p>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </button>
        </form>
      )}

      <div className="card">
        <Async
          state={users}
          empty={{ when: (res) => !res || res.users.length === 0, message: 'No users yet.' }}
        >
          {(res) =>
            res && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Last login</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {res.users.map((user) => (
                      <tr key={user.id} className="clickable" onClick={() => navigate(`/users/${user.id}`)}>
                        <td className="cell-strong">{user.name}</td>
                        <td className="cell-muted">{user.email}</td>
                        <td>{user.role.replace(/_/g, ' ')}</td>
                        <td className="cell-muted">{user.assignedClassName ?? '—'}</td>
                        <td>
                          <StatusPill status={user.status} />
                        </td>
                        <td className="cell-muted">{formatDate(user.lastLoginAt)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="secondary"
                            disabled={user.status !== 'ACTIVE'}
                            onClick={() => deactivate(user.id)}
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Async>
      </div>
    </>
  )
}
