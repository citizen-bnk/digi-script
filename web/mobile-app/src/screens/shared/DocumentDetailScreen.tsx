import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type DocumentSummary } from '../../api/client'
import DocumentPreview from '../../components/DocumentPreview'

const STATUS_COLOR: Record<string, string> = {
  CATEGORIZED: 'var(--secondary)',
  ESCALATED: 'var(--warning)',
  PENDING_REVIEW: 'var(--neutral-600)',
  ARCHIVED: 'var(--neutral-600)',
}

// The document itself, plus what the AI made of it. The capture is shown
// first: someone who has just photographed a form wants to see whether the
// photo came out before they read a confidence score about it.
export function DocumentDetailScreen({ onConfirmed }: { onConfirmed?: () => void } = {}) {
  const { documentId } = useParams<{ documentId: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [confirming, setConfirming] = useState(false)
  const canConfirm = searchParams.get('canConfirm') === '1'

  async function load() {
    if (!documentId || !user?.schoolId) return
    try {
      const res = await api.getDocument(documentId, user.schoolId)
      setDoc(res.document)
      setCategory(res.document.category?.name ?? '')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this document.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, user?.schoolId])

  async function handleConfirm() {
    if (!documentId || !user?.schoolId || !category.trim()) return
    setConfirming(true)
    try {
      await api.confirmDocumentCategory(documentId, user.schoolId, category.trim())
      await load()
      onConfirmed?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm the category.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--neutral-200)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }} aria-label="Back">
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Document</div>
      </div>

      <div className="screen">
        {error && <div className="error-banner">{error}</div>}
        {!doc && !error && <div className="spinner">Loading…</div>}

        {doc && (
          <>
            {user?.schoolId && documentId && (
              <div className="card" style={{ marginBottom: 16 }}>
                <DocumentPreview
                  documentId={documentId}
                  schoolId={user.schoolId}
                  filename={doc.originalFilename}
                  mimeType={doc.mimeType}
                />
              </div>
            )}

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{doc.originalFilename}</div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: STATUS_COLOR[doc.status],
                  border: `1px solid ${STATUS_COLOR[doc.status]}`,
                  borderRadius: 999,
                  padding: '2px 8px',
                  marginBottom: 10,
                }}
              >
                {doc.status}
              </span>
              <dl style={{ margin: 0, fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6 }}>
                <dt style={{ color: 'var(--neutral-600)' }}>Category</dt>
                <dd style={{ margin: 0 }}>{doc.category?.name ?? '—'}</dd>
                <dt style={{ color: 'var(--neutral-600)' }}>Confidence</dt>
                <dd style={{ margin: 0 }}>
                  {doc.categoryConfidence != null ? `${Math.round(doc.categoryConfidence * 100)}%` : '—'}
                </dd>
                <dt style={{ color: 'var(--neutral-600)' }}>Folder</dt>
                <dd style={{ margin: 0 }}>{doc.folderPath ?? '—'}</dd>
              </dl>
              {doc.categoryReasons && doc.categoryReasons.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-600)', marginBottom: 4 }}>
                    Why we think this
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {doc.categoryReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {canConfirm && (
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Confirm or change category</div>
                <div className="field">
                  <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Attendance Register" />
                </div>
                <button className="btn-primary" onClick={handleConfirm} disabled={confirming || !category.trim()}>
                  {confirming ? 'Saving…' : 'Confirm & Continue'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
