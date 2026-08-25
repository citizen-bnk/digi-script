import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type Student } from '../../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 05 ("My Class") —
// minus the per-student attendance % the catalog shows, since there's no
// attendance data model yet.
export function ClassRosterScreen({ basePath }: { basePath: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.schoolId) return
    api
      .listStudents(user.schoolId)
      .then((res) => setStudents(res.students))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your class.'))
  }, [user?.schoolId])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 4px' }}>My Class</h1>
      <p style={{ color: 'var(--neutral-600)', fontSize: 13, margin: '0 0 16px' }}>
        {user?.assignedClassName ?? 'All students'}
      </p>

      {error && <div className="error-banner">{error}</div>}
      {students === null && !error && <div className="spinner">Loading…</div>}
      {students?.length === 0 && <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>No students found.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {students?.map((s) => (
          <button
            key={s.id}
            className="card"
            onClick={() => navigate(`${basePath}/students/${s.id}`)}
            style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {s.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>{s.grade ?? 'Grade not set'}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
