import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'

interface Child {
  id: string
  name: string
  grade?: string | null
  className?: string | null
  dateOfBirth?: string | null
  relationship?: string
}

// Matches docs/design/mobile-app-screens-catalog.md page 02, screen 3 —
// but shows only fields the backend actually stores (name/grade/class/DOB).
// The catalog's Overview/Academics/Attendance/Health tabs need data models
// this backend doesn't have yet, so they're intentionally left out rather
// than shown with fake numbers.
export function MyChildScreen() {
  const [children, setChildren] = useState<Child[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .myChildren()
      .then((res) => setChildren(res.children as Child[]))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your children.'))
  }, [])

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 16px' }}>My Child</h1>

      {error && <div className="error-banner">{error}</div>}
      {children === null && !error && <div className="spinner">Loading…</div>}
      {children?.length === 0 && (
        <p style={{ color: 'var(--neutral-600)', fontSize: 14 }}>
          No children are linked to your account yet. Contact your school administrator.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children?.map((child) => (
          <div key={child.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {child.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{child.name}</div>
                <div style={{ fontSize: 13, color: 'var(--neutral-600)' }}>
                  {child.grade ?? 'Grade not set'}
                  {child.className ? ` · ${child.className}` : ''}
                </div>
              </div>
            </div>
            <dl style={{ margin: 0, fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6 }}>
              <dt style={{ color: 'var(--neutral-600)' }}>Relationship</dt>
              <dd style={{ margin: 0 }}>{child.relationship ?? '—'}</dd>
              <dt style={{ color: 'var(--neutral-600)' }}>Date of birth</dt>
              <dd style={{ margin: 0 }}>
                {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '—'}
              </dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
