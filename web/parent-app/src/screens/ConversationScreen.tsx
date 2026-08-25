import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type Message } from '../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 02, screen 2:
// chat bubbles, confidence badge on AI replies, composer at the bottom.
export function ConversationScreen() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [studentName, setStudentName] = useState<string>('')
  const [status, setStatus] = useState<string>('OPEN')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    if (!conversationId || !user?.schoolId) return
    try {
      const res = await api.getConversation(conversationId, user.schoolId)
      setMessages(res.messages)
      setStudentName(res.conversation.student?.name ?? 'DigiScript')
      setStatus(res.conversation.status)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this conversation.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.schoolId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim() || !conversationId || !user?.schoolId) return
    setSending(true)
    setError(null)
    try {
      await api.sendMessage(conversationId, user.schoolId, draft.trim())
      setDraft('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send that message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid var(--neutral-200)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{studentName}</div>
          <div style={{ fontSize: 12, color: status === 'ESCALATED' ? 'var(--warning)' : 'var(--secondary)' }}>
            {status === 'ESCALATED' ? 'Escalated to staff' : 'Active'}
          </div>
        </div>
      </div>

      <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages === null && <div className="spinner">Loading…</div>}
        {messages?.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="error-banner" style={{ margin: '0 16px' }}>
          {error}
        </div>
      )}

      <form
        onSubmit={handleSend}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--neutral-200)' }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message…"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 20,
            border: '1px solid var(--neutral-200)',
            fontSize: 15,
          }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--primary)',
            color: 'white',
            fontSize: 18,
            cursor: 'pointer',
          }}
          aria-label="Send"
        >
          ➤
        </button>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isParent = message.senderType === 'PARENT'
  return (
    <div style={{ display: 'flex', justifyContent: isParent ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '78%',
          background: isParent ? 'var(--primary)' : 'var(--neutral-50)',
          color: isParent ? 'white' : 'var(--neutral-900)',
          borderRadius: 16,
          borderBottomRightRadius: isParent ? 4 : 16,
          borderBottomLeftRadius: isParent ? 16 : 4,
          padding: '10px 14px',
        }}
      >
        {!isParent && (
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 3 }}>
            {message.senderType === 'AI' ? 'DigiScript Assistant' : 'Staff'}
          </div>
        )}
        <div style={{ fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{message.body}</div>
        {message.confidence != null && (
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            Confidence: {Math.round(message.confidence * 100)}%
          </div>
        )}
      </div>
    </div>
  )
}
