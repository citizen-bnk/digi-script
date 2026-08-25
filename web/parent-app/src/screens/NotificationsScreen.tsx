import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type Conversation } from '../api/client'

// The design catalog's Notifications screen (page 03) shows push/email/SMS
// channel toggles and a rich event feed — none of that exists in the
// backend yet (no Notification model, no delivery channels). Rather than
// fake it, this screen surfaces real signal already available: conversation
// activity, sorted most-recent-first.
export function NotificationsScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.schoolId) return
    api
      .listConversations(user.schoolId)
      .then((res) =>
        setConversations([...res.conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load notifications.'))
  }, [user?.schoolId])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 16px' }}>Notifications</h1>

      {error && <div className="error-banner">{error}</div>}
      {conversations === null && !error && <div className="spinner">Loading…</div>}
      {conversations?.length === 0 && (
        <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>No activity yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conversations?.map((c) => (
          <button
            key={c.id}
            className="card"
            onClick={() => navigate(`/chat/${c.id}`)}
            style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}
          >
            <span style={{ fontSize: 18 }}>{c.status === 'ESCALATED' ? '⚠️' : '💬'}</span>
            <span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {c.status === 'ESCALATED'
                  ? `Your question about ${c.student?.name ?? 'your child'} was escalated to staff`
                  : c.status === 'RESOLVED'
                    ? `A staff member resolved your conversation about ${c.student?.name ?? 'your child'}`
                    : `Conversation about ${c.student?.name ?? 'your child'} updated`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>
                {new Date(c.updatedAt).toLocaleString()}
              </div>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
