import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useSchool } from '../context/SchoolContext'

/**
 * Multi-School Overview (Application Spec section 4): every school with its
 * headline counts, sortable, and clicking a row drills into that school —
 * which here means making it the active school for every other screen.
 */
export default function SchoolsScreen() {
  const { schools, activeSchool, setActiveSchoolId, loading, error, reload } = useSchool()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [reseeding, setReseeding] = useState(false)
  const [reseedNote, setReseedNote] = useState<string | null>(null)

  // Turning demo mode on for a school makes its staff and learners
  // available as one-click demo logins. District-level decision, so it
  // lives here rather than in a school's own settings.
  async function toggleDemo(schoolId: string, enabled: boolean) {
    setBusyId(schoolId)
    setToggleError(null)
    try {
      await api.setSchoolDemoMode(schoolId, enabled)
      reload()
    } catch (err) {
      setToggleError(err instanceof ApiError ? err.message : 'Could not change demo mode')
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Lays the demo district down again from scratch.
   *
   * The seed is open to anyone only while the database is empty; after that
   * it needs a system owner, and there was no way to ask for it — so a demo
   * seeded by an older build stayed on that older data for good. That is how
   * documents seeded before files had bytes ended up unopenable.
   *
   * It replaces everything, which is why it asks first.
   */
  async function reloadDemoData() {
    if (!window.confirm('Replace all demo data with a fresh copy? Existing records are removed.')) {
      return
    }
    setReseeding(true)
    setReseedNote(null)
    try {
      await api.seedDemo()
      setReseedNote('Demo data reloaded.')
      reload()
    } catch (err) {
      setReseedNote(err instanceof ApiError ? err.message : 'Could not reload the demo data')
    } finally {
      setReseeding(false)
    }
  }

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

      <div className="admin-row" style={{ marginBottom: 16 }}>
        <span className="admin-row-text">
          <strong>Demo data</strong>
          <small>
            Reload the demo district — every school, learner, document and
            conversation, replaced with a fresh copy.
          </small>
        </span>
        <button type="button" className="btn-ghost" disabled={reseeding} onClick={reloadDemoData}>
          {reseeding ? 'Reloading…' : 'Reload demo data'}
        </button>
      </div>
      {reseedNote && <div className="error-banner">{reseedNote}</div>}
      {toggleError && <div className="error-banner">{toggleError}</div>}

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
                <th>Demo logins</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="state">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && schools.length === 0 && (
                <tr>
                  <td colSpan={8} className="state">
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
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyId === school.id}
                      aria-pressed={school.demoModeEnabled}
                      onClick={() => toggleDemo(school.id, !school.demoModeEnabled)}
                    >
                      {busyId === school.id
                        ? 'Saving…'
                        : school.demoModeEnabled
                          ? 'On — turn off'
                          : 'Off — turn on'}
                    </button>
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
