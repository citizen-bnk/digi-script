import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError, type Escalation } from '../../api/client'

const TABS = ['NEW', 'IN_PROGRESS', 'RESOLVED'] as const

// Matches docs/design/mobile-app-screens-catalog.md page 04 ("Escalations"
// list): status tabs, priority isn't modeled in the backend so it's
// omitted rather than faked.
export function EscalationsListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<(typeof TABS)[number]>('NEW')
  const [escalations, setEscalations] = useState<Escalation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.schoolId) return
    setEscalations(null)
    api
      .listEscalations(user.schoolId, tab)
      .then((res) => setEscalations(res.escalations))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load escalations.'))
  }, [user?.schoolId, tab])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 12px' }}>Escalations</h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 999,
              border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--neutral-200)'}`,
              background: tab === t ? 'var(--primary)' : 'white',
              color: tab === t ? 'white' : 'var(--neutral-600)',
              cursor: 'pointer',
            }}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {escalations === null && !error && <div className="spinner">Loading…</div>}
      {escalations?.length === 0 && <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>Nothing here.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {escalations?.map((esc) => (
          <button
            key={esc.id}
            className="card"
            onClick={() => navigate(`/supervisor/escalations/${esc.id}`)}
            style={{ textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>{esc.student?.name ?? 'General'}</div>
            <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>{esc.reason}</div>
            <div style={{ fontSize: 11, color: 'var(--neutral-600)', marginTop: 4 }}>
              {new Date(esc.createdAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
