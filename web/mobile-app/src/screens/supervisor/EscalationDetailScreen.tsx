import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type Escalation } from '../../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 04 ("Escalation
// Detail"): branches on what kind of escalation this is — a low-confidence
// document categorization (PRD Use Case 3) or an unresolved parent
// question (PRD Use Case 1) — since the backend models both as the same
// Escalation record with either documentId or conversationId set.
export function EscalationDetailScreen() {
  const { escalationId } = useParams<{ escalationId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [escalation, setEscalation] = useState<Escalation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!user?.schoolId) return
    api
      .listEscalations(user.schoolId)
      .then((res) => {
        const found = res.escalations.find((e) => e.id === escalationId)
        if (!found) {
          setError('Escalation not found.')
          return
        }
        setEscalation(found)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this escalation.'))
  }, [escalationId, user?.schoolId])

  async function handleResolve() {
    if (!escalationId || !user?.schoolId || !notes.trim()) return
    setResolving(true)
    try {
      await api.resolveEscalation(escalationId, user.schoolId, notes.trim())
      navigate('/supervisor/escalations')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resolve this escalation.')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--neutral-200)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }} aria-label="Back">
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{escalation?.student?.name ?? 'Escalation'}</div>
      </div>

      <div className="screen">
        {error && <div className="error-banner">{error}</div>}
        {!escalation && !error && <div className="spinner">Loading…</div>}

        {escalation && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--neutral-600)', marginBottom: 4 }}>{escalation.reasonType.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{escalation.reason}</div>
              {escalation.aiConfidence != null && (
                <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>
                  AI confidence: {Math.round(escalation.aiConfidence * 100)}%
                </div>
              )}
            </div>

            {escalation.documentId && (
              <button
                className="btn-secondary"
                style={{ marginBottom: 16 }}
                onClick={() => navigate(`/supervisor/documents/${escalation.documentId}?canConfirm=1`)}
              >
                Review document & confirm category
              </button>
            )}

            {escalation.conversationId && (
              <button
                className="btn-secondary"
                style={{ marginBottom: 16 }}
                onClick={() => navigate(`/supervisor/conversations/${escalation.conversationId}`)}
              >
                Open conversation
              </button>
            )}

            {escalation.status !== 'RESOLVED' && (
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Resolve with a note</div>
                <div className="field">
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you decide?"
                  />
                </div>
                <button className="btn-primary" onClick={handleResolve} disabled={resolving || !notes.trim()}>
                  {resolving ? 'Saving…' : 'Mark as Resolved'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
