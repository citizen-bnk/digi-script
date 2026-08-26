import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type DocumentSummary, type Student } from '../../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 04 ("Document
// Upload" + "AI Categorization"). The camera capture button uses a real
// <input capture> — on a phone this opens the camera directly, on desktop
// it falls back to a file picker.
export function UploadDocumentScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [students, setStudents] = useState<Student[] | null>(null)
  const [studentId, setStudentId] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [term, setTerm] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<DocumentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        <div
          className="card"
          style={{ marginBottom: 16, textAlign: 'center', borderStyle: 'dashed', cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{file ? file.name : 'Take Photo or Choose File'}</div>
          <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>PDF or image</div>
        </div>

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
