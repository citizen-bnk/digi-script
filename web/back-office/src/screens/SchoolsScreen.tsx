import { useNavigate } from 'react-router-dom'
import { useSchool } from '../context/SchoolContext'

/**
 * Multi-School Overview (Application Spec section 4): every school with its
 * headline counts, sortable, and clicking a row drills into that school —
 * which here means making it the active school for every other screen.
 */
export default function SchoolsScreen() {
  const { schools, activeSchool, setActiveSchoolId, loading, error } = useSchool()
  const navigate = useNavigate()

  function drillInto(schoolId: string) {
    setActiveSchoolId(schoolId)
    navigate('/dashboard')
  }

  return (
    <>
      <div className="page-head">
        <h1>Multi-School Overview</h1>
        <p>Select a school to make it the focus of every other screen.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>School</th>
                <th>Principal</th>
                <th>District</th>
                <th>Users</th>
                <th>Students</th>
                <th>Documents</th>
                <th>Open escalations</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="state">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && schools.length === 0 && (
                <tr>
                  <td colSpan={7} className="state">
                    No schools visible to this account.
                  </td>
                </tr>
              )}
              {schools.map((school) => (
                <tr key={school.id} className="clickable" onClick={() => drillInto(school.id)}>
                  <td className="cell-strong">
                    {school.name}
                    {school.id === activeSchool?.id && (
                      <span className="pill pill-brand" style={{ marginLeft: 8 }}>
                        Viewing
                      </span>
                    )}
                  </td>
                  <td className="cell-muted">{school.principalName ?? '—'}</td>
                  <td className="cell-muted">{school.district?.name ?? '—'}</td>
                  <td>{school.counts.users}</td>
                  <td>{school.counts.students}</td>
                  <td>{school.counts.documents}</td>
                  <td>
                    {school.counts.pendingEscalations > 0 ? (
                      <span className="pill pill-danger">{school.counts.pendingEscalations}</span>
                    ) : (
                      <span className="pill pill-ok">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
