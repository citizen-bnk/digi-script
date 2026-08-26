import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type Message } from '../../api/client'

// Matches docs/design/mobile-app-screens-catalog.md page 04 ("Respond to
// Parent"): a staff-facing view of the same conversation the parent app
// shows, with an internal-note toggle and a resolve action.
export function StaffConversationScreen() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [studentName, setStudentName] = useState('')
  const [status, setStatus] = useState('OPEN')
  const [draft, setDraft] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    if (!conversationId || !user?.schoolId) return
    try {
      const res = await api.getConversation(conversationId, user.schoolId)
      setMessages(res.messages)
      setStudentName(res.conversation.student?.name ?? 'General')
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
      await api.sendStaffReply(conversationId, user.schoolId, draft.trim(), isInternal)
      setDraft('')
      setIsInternal(false)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send that message.')
    } finally {
      setSending(false)
    }
  }

  async function handleResolve() {
    if (!conversationId || !user?.schoolId) return
    setResolving(true)
    try {
      await api.resolveConversation(conversationId, user.schoolId)
      navigate('/supervisor/escalations')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resolve this conversation.')
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
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{studentName}</div>
          <div style={{ fontSize: 12, color: status === 'RESOLVED' ? 'var(--secondary)' : 'var(--warning)' }}>{status}</div>
        </div>
        {status !== 'RESOLVED' && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="btn-secondary"
            style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
          >
            {resolving ? 'Resolving…' : 'Resolve'}
          </button>
        )}
      </div>

      <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages === null && <div className="spinner">Loading…</div>}
        {messages?.map((m) => (
          <StaffMessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="error-banner" style={{ margin: '0 16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid var(--neutral-200)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, color: 'var(--neutral-600)' }}>
          <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
          Internal note (not visible to parent)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isInternal ? 'Add an internal note…' : 'Reply to parent…'}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--neutral-200)', fontSize: 15 }}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: isInternal ? 'var(--warning)' : 'var(--primary)',
              color: 'white',
              fontSize: 18,
              cursor: 'pointer',
            }}
            aria-label="Send"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  )
}

function StaffMessageBubble({ message }: { message: Message }) {
  const isSelf = message.senderType === 'STAFF'
  const background = message.isInternal ? '#fff8e1' : isSelf ? 'var(--primary)' : 'var(--neutral-50)'
  const color = isSelf && !message.isInternal ? 'white' : 'var(--neutral-900)'
  return (
    <div style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '82%', background, color, borderRadius: 16, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 3 }}>
          {message.isInternal ? 'Internal note' : message.senderType === 'AI' ? 'DigiScript Assistant' : message.senderType === 'PARENT' ? 'Parent' : 'Staff'}
        </div>
        <div style={{ fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{message.body}</div>
        {message.confidence != null && (
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Confidence: {Math.round(message.confidence * 100)}%</div>
        )}
      </div>
    </div>
  )
}
