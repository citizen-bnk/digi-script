import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async, StatusPill, formatBytes, formatDate } from '../components/Async'
import UploadPanel from './UploadPanel'

/**
 * Document Library (Application Spec section 5): the data table from the
 * back-office mock — name, category, status, size, uploaded — plus the
 * status filter. There is no "open file" action anywhere: the backend
 * stores a storage key but has no endpoint that serves the bytes back.
 */
export default function DocumentsScreen() {
  const { activeSchool } = useSchool()
  const schoolId = activeSchool?.id
  const [status, setStatus] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)

  const docs = useAsync(
    () => (schoolId ? api.listDocuments(schoolId, status ? { status } : {}) : Promise.resolve(null)),
    [schoolId, status],
  )

  if (!schoolId) {
    return <div className="notice">No school selected.</div>
  }

  return (
    <>
      <div className="page-head">
        <h1>Document Library</h1>
        <p>{activeSchool?.name}</p>
      </div>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="CATEGORIZED">Categorized</option>
            <option value="ESCALATED">Escalated</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
        <button type="button" className="primary" onClick={() => setUploadOpen((open) => !open)}>
          {uploadOpen ? 'Close upload' : 'Upload document'}
        </button>
      </div>

      {uploadOpen && (
        <UploadPanel
          schoolId={schoolId}
          onUploaded={() => {
            setUploadOpen(false)
            docs.reload()
          }}
        />
      )}

      <div className="card">
        <Async
          state={docs}
          empty={{
            when: (res) => !res || res.documents.length === 0,
            message: 'No documents match this filter yet.',
          }}
        >
          {(res) =>
            res && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="cell-strong">
                          <Link to={`/documents/${doc.id}`} style={{ color: 'var(--brand)' }}>
                            {doc.originalFilename}
                          </Link>
                        </td>
                        <td>{doc.category?.name ?? '—'}</td>
                        <td className="cell-muted">
                          {doc.categoryConfidence != null
                            ? `${Math.round(doc.categoryConfidence * 100)}%`
                            : '—'}
                        </td>
                        <td>
                          <StatusPill status={doc.status} />
                        </td>
                        <td className="cell-muted">{formatBytes(doc.sizeBytes)}</td>
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
