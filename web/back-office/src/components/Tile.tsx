import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * A dashboard counter.
 *
 * These used to be plain <div>s, which made the dashboard a dead end: it told
 * you there were nine open escalations and gave you no way to reach them. A
 * tile with a `to` is a real link — right-clickable, middle-clickable, and
 * announced as a link — rather than a div with a click handler.
 *
 * `to` stays optional because not every count has somewhere to go: a district
 * total has no single list behind it, and inventing one would send the reader
 * to a screen whose numbers disagree with the tile they clicked.
 */
export function Tile({
  label,
  value,
  hint,
  to,
  attention,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  to?: string
  attention?: boolean
}) {
  const body = (
    <>
      <div className="label">{label}</div>
      <div className={`value${attention ? ' attention' : ''}`}>{value}</div>
      {hint != null && <div className="hint">{hint}</div>}
    </>
  )

  if (!to) return <div className="tile">{body}</div>

  return (
    <Link to={to} className="tile tile-link">
      {body}
      <span className="tile-go" aria-hidden="true">
        →
      </span>
    </Link>
  )
}
