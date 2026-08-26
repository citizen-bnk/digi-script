import { useState } from 'react'
import { api, ApiError, type Escalation } from '../api/client'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async, StatusPill, formatDate } from '../components/Async'

/**
 * Escalations as the list + detail split view from the back-office mock
 * (design catalog screen 10), with the resolve action attached to the
 * selected item.
 */
export default function EscalationsScreen() {
  const { activeSchool } = useSchool()
  const schoolId = activeSchool?.id
  const [selected, setSelected] = useState<Escalation | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const escalations = useAsync(
    () => (schoolId ? api.listEscalations(schoolId) : Promise.resolve(null)),
    [schoolId],
  )

  async function resolve() {
    if (!schoolId || !selected) return
    setBusy(true)
    setError(null)
    try {
      await api.resolveEscalation(selected.id, schoolId, notes || undefined)
      setSelected(null)
      setNotes('')
      escalations.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resolve this escalation')
    } finally {
      setBusy(false)
    }
  }

  if (!schoolId) return <div className="notice">No school selected.</div>

  return (
    <>
      <div className="page-head">
        <h1>Escalations</h1>
        <p>{activeSchool?.name}</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="split">
        <div className="card">
          <div className="card-head">
            <h2>Queue</h2>
          </div>
          <Async
            state={escalations}
            empty={{ when: (res) => !res || res.escalations.length === 0, message: 'Nothing in the queue.' }}
          >
            {(res) =>
              res && (
                <div>
                  {res.escalations.map((esc) => (
                    <div
                      key={esc.id}
                      className={`list-row${selected?.id === esc.id ? ' selected' : ''}`}
                      onClick={() => {
                        setSelected(esc)
                        setNotes('')
                      }}
                    >
                      <div className="row-title">{esc.reasonType.replace(/_/g, ' ').toLowerCase()}</div>
                      <div className="row-meta">
                        <StatusPill status={esc.status} /> · {formatDate(esc.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </Async>
        </div>

        <div className="card card-pad">
          {!selected ? (
            <div className="state">Select an escalation to see its detail.</div>
          ) : (
            <>
              <h2 style={{ fontSize: 16, marginBottom: 14 }}>
                {selected.reasonType.replace(/_/g, ' ').toLowerCase()}
              </h2>
              <dl className="detail-grid">
                <dt>Status</dt>
                <dd>
                  <StatusPill status={selected.status} />
                </dd>

                <dt>Reason</dt>
                <dd>{selected.reason}</dd>

                <dt>AI confidence</dt>
                <dd>
                  {selected.aiConfidence != null ? `${Math.round(selected.aiConfidence * 100)}%` : '—'}
                </dd>

                <dt>Raised</dt>
                <dd className="cell-muted">{formatDate(selected.createdAt)}</dd>

                <dt>Document</dt>
                <dd className="cell-muted">{selected.documentId ?? '—'}</dd>

                <dt>Conversation</dt>
                <dd className="cell-muted">{selected.conversationId ?? '—'}</dd>
              </dl>

              {selected.status !== 'RESOLVED' && (
                <div style={{ marginTop: 20 }}>
                  <div className="field">
                    <label htmlFor="notes">Resolution notes (optional)</label>
                    <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <button type="button" className="primary" onClick={resolve} disabled={busy}>
                    {busy ? 'Resolving…' : 'Mark as resolved'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
