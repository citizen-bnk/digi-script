import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, type StaffUser } from '../api/client'
import { useSchool } from '../context/SchoolContext'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { Async, StatusPill, formatDate } from '../components/Async'

const ROLES = ['SUPER_USER', 'SUPERVISOR', 'TEACHER', 'SUPPORT', 'PARENT']

/**
 * User Detail Drill-Down (Application Spec section 5): the account's profile,
 * its role and class scope, and deactivation.
 *
 * Email is shown but not editable — it is the login identifier and the unique
 * key, so changing it is an account move, not a field edit.
 */
export default function UserDetailScreen() {
  const { userId } = useParams<{ userId: string }>()
  const { activeSchool } = useSchool()
  const schoolId = activeSchool?.id

  const user = useAsync(
    () => (schoolId && userId ? api.getUser(userId, schoolId) : Promise.resolve(null)),
    [schoolId, userId],
  )

  if (!schoolId) return <div className="notice">No school selected.</div>

  return (
    <>
      <div className="page-head">
        <Link to="/users" style={{ fontSize: 13, color: 'var(--brand)' }}>
          ← User Management
        </Link>
        <h1 style={{ marginTop: 8 }}>{user.data?.user.name ?? 'User'}</h1>
        <p>{activeSchool?.name}</p>
      </div>

      <Async state={user}>
        {(res) => res && <UserForm user={res.user} schoolId={schoolId} onSaved={user.reload} />}
      </Async>
    </>
  )
}

function UserForm({
  user,
  schoolId,
  onSaved,
}: {
  user: StaffUser & { phone?: string | null }
  schoolId: string
  onSaved: () => void
}) {
  const { user: me } = useAuth()
  // The API refuses a self-demotion outright; disabling the controls says so
  // before the request rather than after it.
  const isSelf = me?.id === user.id

  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? '',
    role: user.role,
    assignedClassName: user.assignedClassName ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({
      name: user.name,
      phone: user.phone ?? '',
      role: user.role,
      assignedClassName: user.assignedClassName ?? '',
    })
  }, [user])

  const classScoped = form.role === 'TEACHER' || form.role === 'SUPERVISOR'

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await api.updateUser(user.id, schoolId, {
        name: form.name,
        phone: form.phone.trim() || null,
        ...(isSelf ? {} : { role: form.role }),
        // A role that isn't class-scoped must not keep a stale class on it,
        // or the scope comes back the moment the role does.
        assignedClassName: classScoped ? form.assignedClassName.trim() || null : null,
      })
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the user')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: 'ACTIVE' | 'INACTIVE') {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await api.updateUser(user.id, schoolId, { status })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the account status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="card card-pad" style={{ maxWidth: 560 }} onSubmit={save}>
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 12 }}>Profile</h2>

        {error && <div className="error-banner">{error}</div>}
        {saved && !error && (
          <div className="notice" style={{ marginBottom: 14 }}>
            Saved. The change is recorded in the audit log.
          </div>
        )}

        <dl className="detail-grid" style={{ marginBottom: 18 }}>
          <dt>Email</dt>
          <dd className="cell-strong">{user.email}</dd>
          <dt>Status</dt>
          <dd>
            <StatusPill status={user.status} />
          </dd>
          <dt>Last login</dt>
          <dd className="cell-muted">{formatDate(user.lastLoginAt)}</dd>
        </dl>

        <div className="field">
          <label htmlFor="u-name">Name</label>
          <input
            id="u-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
          />
        </div>
        <div className="field">
          <label htmlFor="u-phone">Phone</label>
          <input
            id="u-phone"
            value={form.phone}
            placeholder="e.g. 082 000 0000"
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="u-role">Role</label>
          <select
            id="u-role"
            value={form.role}
            disabled={isSelf}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          {isSelf && (
            <p className="cell-muted" style={{ marginTop: 6, marginBottom: 0 }}>
              You cannot change your own role — it would sign you out of this screen.
            </p>
          )}
        </div>
        {classScoped && (
          <div className="field">
            <label htmlFor="u-class">Assigned class</label>
            <input
              id="u-class"
              value={form.assignedClassName}
              placeholder="e.g. Grade 4A"
              onChange={(e) => setForm({ ...form, assignedClassName: e.target.value })}
            />
            <p className="cell-muted" style={{ marginTop: 6, marginBottom: 0 }}>
              Blank gives school-wide access instead of access to one class.
            </p>
          </div>
        )}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="card card-pad" style={{ maxWidth: 560, marginTop: 18 }}>
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 8 }}>Account access</h2>
        <p className="cell-muted" style={{ marginTop: 0 }}>
          Deactivating revokes access immediately. The audit trail is preserved either way.
        </p>
        {isSelf ? (
          <p className="cell-muted" style={{ marginBottom: 0 }}>
            You cannot deactivate your own account.
          </p>
        ) : user.status === 'ACTIVE' ? (
          <button type="button" className="secondary" disabled={busy} onClick={() => setStatus('INACTIVE')}>
            Deactivate user
          </button>
        ) : (
          <button type="button" className="primary" disabled={busy} onClick={() => setStatus('ACTIVE')}>
            Reactivate user
          </button>
        )}
      </div>
    </>
  )
}
