import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type DocumentSummary, type Student } from '../../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 04 ("Document
// Upload" + "AI Categorization").
//
// Three sources rather than one, as the design has it. A single input with
// capture="environment" does open the camera on a phone — but it *only*
// opens the camera, so there was no way to send a photo already taken or a
// PDF that arrived by email. The attribute is the difference: with it the
// camera, without it the gallery and file picker.
export function UploadDocumentScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const browseInputRef = useRef<HTMLInputElement>(null)
  const [students, setStudents] = useState<Student[] | null>(null)
  const [studentId, setStudentId] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [term, setTerm] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<DocumentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Object URL for the chosen image, so a capture can be checked before it is
  // sent — the design's "Review & Upload" step. Revoked on replacement, since
  // each one holds the file in memory until it is.
  const [preview, setPreview] = useState<string | null>(null)

  function chooseFile(next: File | null) {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return next && next.type.startsWith('image/') ? URL.createObjectURL(next) : null
    })
    setFile(next)
    setError(null)
  }

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  useEffect(() => {
    if (!user?.schoolId) return
    api.listStudents(user.schoolId).then((res) => setStudents(res.students)).catch(() => null)
  }, [user?.schoolId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file || !user?.schoolId) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('schoolId', user.schoolId)
      form.append('file', file)
      if (studentId) form.append('studentId', studentId)
      if (academicYear) form.append('academicYear', academicYear)
      if (term) form.append('term', term)
      const res = await api.uploadDocument(form)
      setResult(res.document)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  if (result) {
    const highConfidence = result.status === 'CATEGORIZED'
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20, margin: '4px 0 16px' }}>AI Categorization</h1>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--neutral-600)', marginBottom: 4 }}>Suggested category</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{result.category?.name ?? '—'}</div>
          <span
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 700,
              color: highConfidence ? 'var(--secondary)' : 'var(--warning)',
              border: `1px solid ${highConfidence ? 'var(--secondary)' : 'var(--warning)'}`,
              borderRadius: 999,
              padding: '2px 8px',
              marginBottom: 10,
            }}
          >
            {result.categoryConfidence != null ? `${Math.round(result.categoryConfidence * 100)}% confidence` : ''}
          </span>
          {result.categoryReasons && result.categoryReasons.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-600)', margin: '6px 0 4px' }}>
                Why we think this
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {result.categoryReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {!highConfidence && (
            <p style={{ fontSize: 13, color: 'var(--warning)', marginTop: 10 }}>
              Confidence is below the auto-file threshold — this has been sent to the escalation queue for review.
            </p>
          )}
        </div>
        <button
          className="btn-primary"
          style={{ marginBottom: 8 }}
          onClick={() => navigate(`/supervisor/documents/${result.id}?canConfirm=1`)}
        >
          {highConfidence ? 'Change category' : 'Confirm & Continue'}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/supervisor/documents')}>
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 16px' }}>Upload Document</h1>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* capture="environment" opens the rear camera; without it the same
            control offers the gallery or the file picker instead. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
        />
        <input
          ref={browseInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
        />

        <div className="capture-sources">
          <button type="button" className="capture-source" onClick={() => cameraInputRef.current?.click()}>
            <span className="capture-source-icon" aria-hidden="true">📷</span>
            <strong>Take Photo</strong>
            <small>Use camera</small>
          </button>
          <button type="button" className="capture-source" onClick={() => galleryInputRef.current?.click()}>
            <span className="capture-source-icon" aria-hidden="true">🖼️</span>
            <strong>Choose Files</strong>
            <small>From gallery</small>
          </button>
          <button type="button" className="capture-source" onClick={() => browseInputRef.current?.click()}>
            <span className="capture-source-icon" aria-hidden="true">📄</span>
            <strong>Browse</strong>
            <small>Files &amp; folders</small>
          </button>
        </div>

        {file && (
          <div className="capture-review">
            {preview ? (
              <img src={preview} alt="The document you captured" className="capture-preview" />
            ) : (
              <span className="capture-preview is-file" aria-hidden="true">📄</span>
            )}
            <span className="capture-review-text">
              <strong>{file.name}</strong>
              <small>
                {file.type || 'file'} · {(file.size / 1024).toFixed(0)} KB
              </small>
            </span>
            <button type="button" className="capture-clear" onClick={() => chooseFile(null)}>
              Retake
            </button>
          </div>
        )}

        {!file && (
          <p style={{ fontSize: 12, color: 'var(--neutral-600)', textAlign: 'center', margin: '0 0 16px' }}>
            Photos and PDFs, up to 4 MB.
          </p>
        )}

        <div className="field">
          <label htmlFor="student">Student (optional)</label>
          <select
            id="student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--neutral-200)', fontSize: 15 }}
          >
            <option value="">School-wide (no specific student)</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="year">Academic year</label>
            <input id="year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2026" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="term">Term</label>
            <input id="term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term 3" />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={!file || uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
