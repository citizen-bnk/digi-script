import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type Escalation, type Student } from '../../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 04's supervisor
// mobile home — school-health-style summary tiles replaced with real
// counts (open escalations, roster size) rather than fabricated metrics.
export function SupervisorHomeScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [escalations, setEscalations] = useState<Escalation[] | null>(null)
  const [students, setStudents] = useState<Student[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.schoolId) return
    api
      .listEscalations(user.schoolId, 'NEW')
      .then((res) => setEscalations(res.escalations))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load escalations.'))
    api
      .listStudents(user.schoolId)
      .then((res) => setStudents(res.students))
      .catch(() => null)
  }, [user?.schoolId])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 22, margin: '4px 0 2px' }}>Welcome, {user?.name.split(' ')[0]}</h1>
      <p style={{ color: 'var(--neutral-600)', fontSize: 14, margin: '0 0 20px' }}>
        {user?.assignedClassName ?? 'School-wide'}
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{escalations?.length ?? '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>New escalations</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{students?.length ?? '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>Students</div>
        </div>
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Pending Escalations</div>
      {escalations === null && <div className="spinner">Loading…</div>}
      {escalations?.length === 0 && <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>All caught up.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {escalations?.map((esc) => (
          <button
            key={esc.id}
            className="card"
            onClick={() => navigate(`/supervisor/escalations/${esc.id}`)}
            style={{ textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>{esc.student?.name ?? 'General'}</div>
            <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>{esc.reason}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
