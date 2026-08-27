import type { ReactNode } from 'react'

/** Uniform loading / error / empty handling so screens only render data. */
export function Async<T>({
  state,
  empty,
  children,
}: {
  state: { data: T | null; loading: boolean; error: string | null }
  empty?: { when: (data: T) => boolean; message: string }
  children: (data: T) => ReactNode
}) {
  // Only the first load blanks the screen. A reload — after saving, or after
  // a filter change — keeps the data that is already there: swapping a form
  // for "Loading…" unmounts it mid-save, which took the "Saved" confirmation
  // down with it and reset every field the moment the change succeeded.
  if (state.loading && state.data == null) return <div className="state">Loading…</div>
  if (state.error) return <div className="error-banner">{state.error}</div>
  if (!state.data) return <div className="state">Nothing to show.</div>
  if (empty?.when(state.data)) return <div className="state">{empty.message}</div>
  return <>{children(state.data)}</>
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'RESOLVED' || status === 'CATEGORIZED' || status === 'ACTIVE'
      ? 'pill-ok'
      : status === 'ESCALATED' || status === 'NEW'
        ? 'pill-danger'
        : status === 'IN_PROGRESS' || status === 'PENDING'
          ? 'pill-warn'
          : 'pill-neutral'
  return <span className={`pill ${tone}`}>{status.replace(/_/g, ' ')}</span>
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
