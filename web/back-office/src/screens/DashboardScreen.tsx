import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async, formatDate } from '../components/Async'
import { Tile } from '../components/Tile'
import { auditTargetPath } from '../lib/audit-target'

/**
 * Application Spec sections 4 and 5 both open on a dashboard of headline
 * cards. Only the counts the backend actually tracks are shown — the budget,
 * cash-flow and government-report cards the spec also lists have no data
 * model behind them yet, and this portal never displays invented figures.
 *
 * Every count is a way into the list behind it. The district totals are the
 * exception: they add up several schools and this portal's lists are always
 * scoped to one, so they lead to the school breakdown instead of to a roster
 * whose total would not match the tile that opened it.
 */
export default function DashboardScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { activeSchool, schools } = useSchool()
  const isOwner = user?.role === 'SYSTEM_OWNER'
  const schoolId = activeSchool?.id

  const stats = useAsync(() => (schoolId ? api.schoolStats(schoolId) : Promise.resolve(null)), [schoolId])
  const activity = useAsync(
    () => (schoolId ? api.listAudit({ schoolId }) : Promise.resolve(null)),
    [schoolId],
  )

  if (!schoolId) {
    return (
      <>
        <div className="page-head">
          <h1>Dashboard</h1>
        </div>
        <div className="notice">
          This account isn’t linked to a school yet, so there’s nothing to summarise.
        </div>
      </>
    )
  }

  const districtTotals = schools.reduce(
    (acc, school) => ({
      students: acc.students + school.counts.students,
      documents: acc.documents + school.counts.documents,
      pendingEscalations: acc.pendingEscalations + school.counts.pendingEscalations,
    }),
    { students: 0, documents: 0, pendingEscalations: 0 },
  )

  return (
    <>
      <div className="page-head">
        <h1>{isOwner ? 'District Dashboard' : 'School Dashboard'}</h1>
        <p>
          {isOwner
            ? `${schools.length} school${schools.length === 1 ? '' : 's'} — currently viewing ${activeSchool?.name}`
            : activeSchool?.name}
        </p>
      </div>

      {isOwner && (
        <div className="tile-grid">
          <Tile label="Schools" value={schools.length} hint="Across the district" to="/schools" />
          <Tile
            label="Students (district)"
            value={districtTotals.students}
            hint="See by school"
            to="/schools"
          />
          <Tile
            label="Documents (district)"
            value={districtTotals.documents}
            hint="See by school"
            to="/schools"
          />
          <Tile
            label="Open escalations"
            value={districtTotals.pendingEscalations}
            attention={districtTotals.pendingEscalations > 0}
            hint="See by school"
            to="/schools"
          />
        </div>
      )}

      <h2 style={{ fontSize: 15, margin: '0 0 12px' }}>{activeSchool?.name}</h2>
      <Async state={stats}>
        {(res) =>
          res && (
            <div className="tile-grid">
              <Tile label="Active staff &amp; users" value={res.stats.users} to="/users" />
              <Tile label="Students" value={res.stats.students} to="/students" />
              <Tile label="Documents" value={res.stats.documents} to="/documents" />
              {/* Awaiting review was a hint inside the Documents tile. It is a
                  count with a destination of its own, and a link inside a link
                  is not a thing a browser will render — so it is its own tile,
                  opening the library already filtered. */}
              <Tile
                label="Awaiting review"
                value={res.stats.documentsAwaitingReview}
                attention={res.stats.documentsAwaitingReview > 0}
                hint="Escalated for a human decision"
                to="/documents?status=ESCALATED"
              />
              <Tile
                label="Open escalations"
                value={res.stats.pendingEscalations}
                attention={res.stats.pendingEscalations > 0}
                to="/escalations"
              />
            </div>
          )
        }
      </Async>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-head">
          <h2>Recent activity</h2>
          <Link to="/audit" style={{ fontSize: 13, color: 'var(--brand)' }}>
            View audit log →
          </Link>
        </div>
        <Async
          state={activity}
          empty={{ when: (res) => !res || res.entries.length === 0, message: 'No recorded activity yet.' }}
        >
          {(res) =>
            res && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Target</th>
                      <th>When</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {res.entries.slice(0, 8).map((entry) => {
                      const path = auditTargetPath(entry.targetType, entry.targetId)
                      return (
                        <tr
                          key={entry.id}
                          className={path ? 'clickable' : undefined}
                          onClick={path ? () => navigate(path) : undefined}
                        >
                          <td className="cell-strong">{entry.action.replace(/_/g, ' ').toLowerCase()}</td>
                          <td className="cell-muted">{entry.targetType ?? '—'}</td>
                          <td className="cell-muted">{formatDate(entry.createdAt)}</td>
                          <td className="cell-muted row-open" aria-hidden="true">
                            {path ? '›' : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </Async>
      </div>

      <div className="notice">
        <h3>Not in this build</h3>
        Budget tracking and approvals, financial consolidation, government compliance reports, the knowledge-base
        index, and PDF/Excel exports are all described in the Application Specification but have no data model behind
        them yet — the <code>Budget</code> table is still a stub. They are left out rather than mocked up, so nothing
        on this page is a placeholder number.
      </div>
    </>
  )
}
