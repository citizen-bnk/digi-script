import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'

/**
 * Shows a document's actual contents.
 *
 * Every document screen in this app stopped at metadata, because the API had
 * no endpoint that served the bytes back. There is one now — and a scanning
 * app whose captures can never be looked at again is asking people to trust
 * that the photo they took came out.
 *
 * The bytes need a bearer token, so this cannot be an <img src>: it fetches
 * a Blob and renders an object URL, revoking it on the way out.
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
    let gone = false
    let objectUrl: string | null = null

    setLoading(true)
    setError(null)
    api
      .documentFile(documentId, schoolId)
      .then((blob) => {
        if (gone) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((err) => {
        if (!gone) setError(err instanceof ApiError ? err.message : 'Could not load the file.')
      })
      .finally(() => {
        if (!gone) setLoading(false)
      })

    return () => {
      gone = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId, schoolId])

  if (loading) return <div className="spinner">Loading the file…</div>
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
          <div style={{ padding: 20, fontSize: 13, color: 'var(--neutral-600)' }}>
            No inline viewer for {mimeType ?? 'this file type'}.
          </div>
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-block', marginTop: 10, fontSize: 13, color: 'var(--primary)' }}
      >
        Open full size →
      </a>
    </div>
  )
}
