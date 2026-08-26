import { useState, type FormEvent } from 'react'
import { api, ApiError, type DocumentSummary } from '../api/client'

/**
 * Upload with AI categorization review (Application Spec section 5): the
 * suggestion and its confidence come back from the same request, so the
 * result is shown inline for confirmation rather than on a separate screen.
 */
export default function UploadPanel({ schoolId, onUploaded }: { schoolId: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DocumentSummary | null>(null)
  const [category, setCategory] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('schoolId', schoolId)
      form.append('file', file)
      const res = await api.uploadDocument(form)
      setResult(res.document)
      setCategory(res.document.category?.name ?? '')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!result) return
    setBusy(true)
    setError(null)
    try {
      await api.confirmDocumentCategory(result.id, schoolId, category)
      setResult(null)
      setFile(null)
      onUploaded()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm the category')
    } finally {
      setBusy(false)
    }
  }

  const confidence = result?.categoryConfidence ?? null

  return (
    <div className="card card-pad" style={{ marginBottom: 18 }}>
      {error && <div className="error-banner">{error}</div>}

      {!result ? (
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="file">Choose a file</label>
            <input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <button type="submit" className="primary" disabled={!file || busy}>
            {busy ? 'Uploading…' : 'Upload and categorize'}
          </button>
        </form>
      ) : (
        <>
          <h2 style={{ fontSize: 15, marginBottom: 4 }}>AI categorization</h2>
          <p className="cell-muted" style={{ margin: '0 0 14px' }}>{result.originalFilename}</p>

          {confidence != null && (
            <>
              <div className="cell-muted">
                {Math.round(confidence * 100)}% confident — {result.category?.name}
              </div>
              <div className="confidence-bar">
                <span style={{ width: `${Math.round(confidence * 100)}%` }} />
              </div>
            </>
          )}

          {result.categoryReasons && result.categoryReasons.length > 0 && (
            <ul className="reason-list">
              {result.categoryReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}

          <div className="field" style={{ marginTop: 16, maxWidth: 340 }}>
            <label htmlFor="category">Confirm or correct the category</label>
            <input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>

          <button type="button" className="primary" onClick={confirm} disabled={busy || !category.trim()}>
            {busy ? 'Saving…' : 'Confirm category'}
          </button>
        </>
      )}
    </div>
  )
}
