import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type DocumentSummary } from '../../api/client'

export function SupervisorDocumentsScreen() {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Documents</h1>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
          onClick={() => navigate('/supervisor/documents/upload')}
        >
          + Upload
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {documents === null && !error && <div className="spinner">Loading…</div>}
      {documents?.length === 0 && <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>No documents yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents?.map((doc) => (
          <button
            key={doc.id}
            className="card"
            onClick={() => navigate(`/supervisor/documents/${doc.id}?canConfirm=1`)}
            style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
          >
            <span>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.originalFilename}</div>
              <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>
                {doc.category?.name ?? 'Uncategorized'} {doc.student ? `· ${doc.student.name}` : ''}
              </div>
            </span>
            {doc.status === 'ESCALATED' && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', alignSelf: 'flex-start' }}>
                NEEDS REVIEW
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
