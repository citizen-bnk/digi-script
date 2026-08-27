import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async, StatusPill, formatBytes, formatDate } from '../components/Async'
import DocumentPreview from '../components/DocumentPreview'

export default function DocumentDetailScreen() {
  const { documentId } = useParams<{ documentId: string }>()
  const { activeSchool } = useSchool()
  const schoolId = activeSchool?.id
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const doc = useAsync(
    () => (schoolId && documentId ? api.getDocument(documentId, schoolId) : Promise.resolve(null)),
    [schoolId, documentId],
  )

  async function confirm() {
    if (!schoolId || !documentId) return
    setBusy(true)
    setError(null)
    try {
      await api.confirmDocumentCategory(documentId, schoolId, category)
      setConfirmed(true)
      doc.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm the category')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <Link to="/documents" style={{ fontSize: 13, color: 'var(--brand)' }}>
          ← Document Library
        </Link>
        <h1 style={{ marginTop: 8 }}>Document</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {confirmed && (
        <div className="notice" style={{ marginBottom: 16 }}>
          Category confirmed. Any escalation raised for this document has been resolved automatically.
        </div>
      )}

      <Async state={doc}>
        {(res) =>
          res && (
            <>
              <div className="card card-pad" style={{ marginBottom: 18 }}>
                <dl className="detail-grid">
                  <dt>File</dt>
                  <dd className="cell-strong">{res.document.originalFilename}</dd>

                  <dt>Status</dt>
                  <dd>
                    <StatusPill status={res.document.status} />
                  </dd>

                  <dt>Category</dt>
                  <dd>{res.document.category?.name ?? '—'}</dd>

                  <dt>Confidence</dt>
                  <dd>
                    {res.document.categoryConfidence != null ? (
                      <>
                        {Math.round(res.document.categoryConfidence * 100)}%
                        <div className="confidence-bar">
                          <span style={{ width: `${Math.round(res.document.categoryConfidence * 100)}%` }} />
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>

                  <dt>Folder</dt>
                  <dd className="cell-muted">{res.document.folderPath ?? '—'}</dd>

                  <dt>Size</dt>
                  <dd className="cell-muted">{formatBytes(res.document.sizeBytes)}</dd>

                  <dt>Uploaded</dt>
                  <dd className="cell-muted">{formatDate(res.document.createdAt)}</dd>
                </dl>

                {res.document.categoryReasons && res.document.categoryReasons.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 13, marginTop: 18 }}>Why the AI suggested this</h3>
                    <ul className="reason-list">
                      {res.document.categoryReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </>
                )}

              </div>

              <div className="card card-pad" style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 12 }}>File</h2>
                {schoolId && documentId && (
                  <DocumentPreview
                    documentId={documentId}
                    schoolId={schoolId}
                    filename={res.document.originalFilename}
                    mimeType={res.document.mimeType}
                  />
                )}
              </div>

              <div className="card card-pad">
                <h2 style={{ fontSize: 15, marginBottom: 10 }}>Correct the category</h2>
                <div className="field" style={{ maxWidth: 340 }}>
                  <label htmlFor="cat">Category</label>
                  <input
                    id="cat"
                    value={category}
                    placeholder={res.document.category?.name ?? 'e.g. Financial - Expense Invoice'}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                <button type="button" className="primary" onClick={confirm} disabled={busy || !category.trim()}>
                  {busy ? 'Saving…' : 'Confirm category'}
                </button>
              </div>
            </>
          )
        }
      </Async>
    </>
  )
}
