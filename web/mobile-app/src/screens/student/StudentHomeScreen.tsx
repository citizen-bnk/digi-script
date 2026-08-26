import { useEffect, useState } from 'react'
import { api, ApiError, type Student } from '../../api/client'

// The STUDENT role is deliberately scoped to login + read-only self-view
// only (see README's Product decisions) — no courses/assignments/grades.
// This is that one screen.
export function StudentHomeScreen() {
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .myOwnStudentRecord()
      .then((res) => setStudent(res.student))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your record.'))
  }, [])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 16px' }}>My Profile</h1>

      {error && <div className="error-banner">{error}</div>}
      {!student && !error && <div className="spinner">Loading…</div>}

      {student && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {student.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{student.name}</div>
              <div style={{ fontSize: 13, color: 'var(--neutral-600)' }}>
                {student.grade ?? 'Grade not set'}
                {student.className ? ` · ${student.className}` : ''}
              </div>
            </div>
          </div>
          <dl style={{ margin: 0, fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6 }}>
            <dt style={{ color: 'var(--neutral-600)' }}>Date of birth</dt>
            <dd style={{ margin: 0 }}>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}</dd>
          </dl>
        </div>
      )}
    </div>
  )
}
