import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type DocumentSummary, type Student } from '../../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 05 ("Home"), minus
// the Avg Attendance/Avg Grade tiles the catalog shows — those need a data
// model this backend doesn't have (see root README's known gaps).
export function TeacherHomeScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[] | null>(null)
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.schoolId) return
    api
      .listStudents(user.schoolId)
      .then((res) => setStudents(res.students))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your class.'))
    api
      .listDocuments(user.schoolId)
      .then((res) => setDocuments(res.documents.slice(0, 5)))
      .catch(() => null)
  }, [user?.schoolId])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 22, margin: '4px 0 2px' }}>Good morning, {user?.name.split(' ')[0]}</h1>
      <p style={{ color: 'var(--neutral-600)', fontSize: 14, margin: '0 0 20px' }}>
        {user?.assignedClassName ?? 'Your class'}
      </p>

      {error && <div className="error-banner">{error}</div>}

      {/* A count with a list behind it should open that list — this one used
          to be a dead tile above a nav bar that could reach the same roster. */}
      <button
        type="button"
        className="card"
        onClick={() => navigate('/teacher/class')}
        style={{ marginBottom: 16, width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        <div style={{ fontSize: 13, color: 'var(--neutral-600)', marginBottom: 4 }}>My Class Overview</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{students?.length ?? '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--neutral-600)' }}>Students ›</div>
      </button>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Recent Documents</div>
      {documents === null && <div className="spinner">Loading…</div>}
      {documents?.length === 0 && <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>No documents yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents?.map((doc) => (
          <button
            key={doc.id}
            className="card"
            onClick={() => navigate(`/teacher/documents/${doc.id}`)}
            style={{ textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.originalFilename}</div>
            <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>{doc.category?.name ?? 'Uncategorized'}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
