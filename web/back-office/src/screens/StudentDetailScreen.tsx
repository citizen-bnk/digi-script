import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, type Student } from '../api/client'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async, formatDate } from '../components/Async'

/**
 * Student Detail Drill-Down (Application Spec section 5).
 *
 * The roster used to be the end of the road: a learner recorded in the wrong
 * class stayed there. This is the edit surface, plus the two lists that
 * belong to a learner — their documents and their escalations — so the
 * record reads as a file rather than four fields.
 */

/** An <input type="date"> wants YYYY-MM-DD; the API sends an ISO timestamp. */
function toDateInput(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export default function StudentDetailScreen() {
  const { studentId } = useParams<{ studentId: string }>()
  const { activeSchool } = useSchool()
  const schoolId = activeSchool?.id

  const student = useAsync(
    () => (studentId ? api.getStudent(studentId) : Promise.resolve(null)),
    [studentId],
  )
  const documents = useAsync(
    () => (schoolId && studentId ? api.listDocuments(schoolId, { studentId }) : Promise.resolve(null)),
    [schoolId, studentId],
  )

  return (
    <>
      <div className="page-head">
        <Link to="/students" style={{ fontSize: 13, color: 'var(--brand)' }}>
          ← Student Records
        </Link>
        <h1 style={{ marginTop: 8 }}>{student.data?.student.name ?? 'Student'}</h1>
        <p>{activeSchool?.name}</p>
      </div>

      <Async state={student}>
        {(res) =>
          res && (
            <>
              <StudentForm student={res.student} onSaved={student.reload} />

              <div className="card" style={{ marginTop: 18 }}>
                <div className="card-pad" style={{ paddingBottom: 0 }}>
                  <h2 style={{ fontSize: 15, margin: 0 }}>Documents</h2>
                </div>
                <Async
                  state={documents}
                  empty={{
                    when: (docs) => !docs || docs.documents.length === 0,
                    message: 'No documents filed against this learner yet.',
                  }}
                >
                  {(docs) =>
                    docs && (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>File</th>
                              <th>Category</th>
                              <th>Uploaded</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docs.documents.map((doc) => (
                              <tr key={doc.id}>
                                <td className="cell-strong">
                                  <Link to={`/documents/${doc.id}`} style={{ color: 'var(--brand)' }}>
                                    {doc.originalFilename}
                                  </Link>
                                </td>
                                <td>{doc.category?.name ?? '—'}</td>
                                <td className="cell-muted">{formatDate(doc.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }
                </Async>
              </div>
            </>
          )
        }
      </Async>
    </>
  )
}

function StudentForm({ student, onSaved }: { student: Student; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: student.name,
    grade: student.grade ?? '',
    className: student.className ?? '',
    dateOfBirth: toDateInput(student.dateOfBirth),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // A reload after saving hands back a new record; the form must follow it,
  // or the next edit is made against values the server has already replaced.
  useEffect(() => {
    setForm({
      name: student.name,
      grade: student.grade ?? '',
      className: student.className ?? '',
      dateOfBirth: toDateInput(student.dateOfBirth),
    })
  }, [student])

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      // An emptied field means "clear this", which the API spells as null —
      // sending "" would store a blank string that reads as a real value.
      await api.updateStudent(student.id, {
        name: form.name,
        grade: form.grade.trim() || null,
        className: form.className.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
      })
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the student record')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card card-pad" style={{ maxWidth: 560 }} onSubmit={save}>
      <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 12 }}>Record</h2>

      {error && <div className="error-banner">{error}</div>}
      {saved && !error && (
        <div className="notice" style={{ marginBottom: 14 }}>
          Saved. The change is recorded in the audit log.
        </div>
      )}

      <div className="field">
        <label htmlFor="s-name">Full name</label>
        <input
          id="s-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="s-grade">Grade</label>
        <input
          id="s-grade"
          value={form.grade}
          placeholder="e.g. Grade 4"
          onChange={(e) => setForm({ ...form, grade: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="s-class">Class</label>
        <input
          id="s-class"
          value={form.className}
          placeholder="e.g. Grade 4A"
          onChange={(e) => setForm({ ...form, className: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="s-dob">Date of birth</label>
        <input
          id="s-dob"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
        />
      </div>

      <button type="submit" className="primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
