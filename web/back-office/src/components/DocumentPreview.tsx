import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'

/**
 * Shows a document's actual contents.
 *
 * The detail screen used to end with a note saying there was no preview,
 * because the API stored a storage key and had no endpoint that served the
 * bytes back. There is one now, and a document library where no document can
 * be opened is a filing cabinet that has been welded shut.
 *
 * The bytes need a bearer token, so this cannot be an <img src> or a plain
 * download link — it fetches a Blob and renders an object URL, revoking it
 * when the document changes or the screen goes away.
 */
export default function DocumentPreview({
  documentId,
  schoolId,
  filename,
  mimeType,
}: {
  documentId: string
  schoolId: string
  filename: string
  mimeType?: string | null
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null

    setLoading(true)
    setError(null)
    api
      .documentFile(documentId, schoolId)
      .then((blob) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((err) => {
        if (!revoked) setError(err instanceof ApiError ? err.message : 'Could not load the file')
      })
      .finally(() => {
        if (!revoked) setLoading(false)
      })

    return () => {
      revoked = true
      // An object URL pins the blob in memory until it is revoked, and a
      // library is a lot of documents to leave pinned.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId, schoolId])

  if (loading) return <div className="state">Loading the file…</div>
  if (error) return <div className="error-banner">{error}</div>
  if (!url) return null

  const isImage = (mimeType ?? '').startsWith('image/')
  const isPdf = (mimeType ?? '').includes('pdf')

  return (
    <div>
      <div className="doc-preview">
        {isImage ? (
          <img src={url} alt={filename} />
        ) : isPdf ? (
          <iframe src={url} title={filename} />
        ) : (
          <div className="state">
            No inline viewer for {mimeType ?? 'this file type'} — open it in a new tab instead.
          </div>
        )}
      </div>
      <p style={{ marginTop: 10, marginBottom: 0 }}>
        <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', fontSize: 13 }}>
          Open in a new tab →
        </a>
      </p>
    </div>
  )
}
