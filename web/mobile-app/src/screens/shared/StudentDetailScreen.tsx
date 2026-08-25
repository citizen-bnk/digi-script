import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, type DocumentSummary, type Student } from '../../api/client'

// Shared by Teacher and Supervisor (both reach a student via their roster).
// Shows only fields the Student model actually stores — no fabricated
// attendance/grade numbers, same honesty rule as the Parent app's My Child
// screen.
export function StudentDetailScreen({ basePath }: { basePath: string }) {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    api
      .getStudent(studentId)
      .then((res) => setStudent(res.student))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this student.'))
  }, [studentId])

  useEffect(() => {
    if (!student) return
    api
      .listDocuments(student.schoolId, { studentId: student.id })
      .then((res) => setDocuments(res.documents))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load documents.'))
  }, [student])

  return (
    <div className="app-shell" style={{ paddingBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--neutral-200)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }} aria-label="Back">
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{student?.name ?? 'Student'}</div>
      </div>

      <div className="screen">
        {error && <div className="error-banner">{error}</div>}
        {!student && !error && <div className="spinner">Loading…</div>}

        {student && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
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

            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Documents</div>
            {documents === null && <div className="spinner">Loading…</div>}
            {documents?.length === 0 && (
              <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>No documents on file for this student.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents?.map((doc) => (
                <button
                  key={doc.id}
                  className="card"
                  onClick={() => navigate(`${basePath}/documents/${doc.id}`)}
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.originalFilename}</div>
                  <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>{doc.category?.name ?? 'Uncategorized'}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
