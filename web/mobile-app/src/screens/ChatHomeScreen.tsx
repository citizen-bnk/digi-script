import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type Conversation } from '../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 02, screen 1:
// greeting header, "Ask a quick question" shortcut, recent conversations.
export function ChatHomeScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!user?.schoolId) return
    api
      .listConversations(user.schoolId)
      .then((res) => setConversations(res.conversations))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load conversations.'))
  }, [user?.schoolId])

  async function askQuickQuestion() {
    if (!user?.schoolId) return
    setStarting(true)
    try {
      const children = await api.myChildren()
      const studentId = children.children[0]?.id
      const { conversation } = await api.startConversation(user.schoolId, studentId)
      navigate(`/chat/${conversation.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start a conversation.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="screen">
      <h1 style={{ fontSize: 22, margin: '4px 0 2px' }}>Hello, {user?.name.split(' ')[0]} 👋</h1>
      <p style={{ color: 'var(--neutral-600)', fontSize: 14, margin: '0 0 20px' }}>How can I help you today?</p>

      {error && <div className="error-banner">{error}</div>}

      <button
        className="card"
        onClick={askQuickQuestion}
        disabled={starting}
        style={{
          width: '100%',
          textAlign: 'left',
          border: '1px solid var(--neutral-200)',
          cursor: 'pointer',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 22 }}>💬</span>
        <span>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {starting ? 'Starting…' : 'Ask a quick question'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--neutral-600)' }}>Try: "What's my child's attendance?"</div>
        </span>
      </button>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Recent Conversations</div>

      {conversations === null && <div className="spinner">Loading…</div>}
      {conversations?.length === 0 && (
        <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>No conversations yet — ask a question above.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conversations?.map((c) => (
          <button
            key={c.id}
            className="card"
            onClick={() => navigate(`/chat/${c.id}`)}
            style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
          >
            <span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.student?.name ?? 'General'}</div>
              <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>
                {new Date(c.updatedAt).toLocaleString()}
              </div>
            </span>
            <StatusPill status={c.status} />
          </button>
        ))}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: Conversation['status'] }) {
  const color = status === 'ESCALATED' ? 'var(--warning)' : status === 'RESOLVED' ? 'var(--secondary)' : 'var(--primary)'
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        fontSize: 11,
        fontWeight: 700,
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  )
}
