import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async, formatDate } from '../components/Async'

/**
 * Audit Logs (PRD Use Case 4). A SYSTEM_OWNER may query across the district
 * by leaving the school filter off; every other role is pinned to their own
 * school by the API regardless of what is sent.
 */
export default function AuditScreen() {
  const { user } = useAuth()
  const { activeSchool, schools } = useSchool()
  const isOwner = user?.role === 'SYSTEM_OWNER'
  const [scope, setScope] = useState<string>(activeSchool?.id ?? '')
  const [action, setAction] = useState('')

  const effectiveSchoolId = isOwner ? scope : activeSchool?.id

  const entries = useAsync(
    () =>
      api.listAudit({
        ...(effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}),
        ...(action ? { action } : {}),
      }),
    [effectiveSchoolId, action],
  )

  return (
    <>
      <div className="page-head">
        <h1>Audit Logs</h1>
        <p>Immutable record of every document, user and escalation change.</p>
      </div>

      <div className="filter-bar">
        {isOwner && (
          <div className="field">
            <label htmlFor="scope">School</label>
            <select id="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="">Whole district</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="action">Action</label>
          <select id="action" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            <option value="DOCUMENT_UPLOADED">Document uploaded</option>
            <option value="DOCUMENT_CATEGORY_CONFIRMED">Category confirmed</option>
            <option value="ESCALATION_RESOLVED">Escalation resolved</option>
            <option value="USER_CREATED">User created</option>
            <option value="USER_DEACTIVATED">User deactivated</option>
            <option value="SCHOOL_REGISTERED">School registered</option>
          </select>
        </div>
      </div>

      <div className="card">
        <Async
          state={entries}
          empty={{ when: (res) => res.entries.length === 0, message: 'No audit entries match these filters.' }}
        >
          {(res) => (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Target type</th>
                    <th>Target</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {res.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="cell-strong">{entry.action.replace(/_/g, ' ').toLowerCase()}</td>
                      <td>{entry.targetType ?? '—'}</td>
                      <td className="cell-muted" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                        {entry.targetId ? `${entry.targetId.slice(0, 8)}…` : '—'}
                      </td>
                      <td className="cell-muted">{formatDate(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
      </div>

      <p className="cell-muted" style={{ marginTop: 14 }}>
        PDF and Excel export are described in the spec but not built — there is no export endpoint yet.
      </p>
    </>
  )
}
