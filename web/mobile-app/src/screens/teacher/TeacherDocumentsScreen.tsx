import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type DocumentSummary } from '../../api/client'

// Read-only — matches PRD Application Spec section 7 (Teacher Module):
// "View school documents (no upload access)".
export function TeacherDocumentsScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.schoolId) return
    api
      .listDocuments(user.schoolId)
      .then((res) => setDocuments(res.documents))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load documents.'))
  }, [user?.schoolId])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 16px' }}>Documents</h1>

      {error && <div className="error-banner">{error}</div>}
      {documents === null && !error && <div className="spinner">Loading…</div>}
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
            <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>
              {doc.category?.name ?? 'Uncategorized'} {doc.student ? `· ${doc.student.name}` : ''}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
