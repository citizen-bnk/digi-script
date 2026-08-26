import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'
import { activePanelIndex, panelScrollOffset, stepPanel } from '../lib/carousel'
import { CapIcon, ChevronIcon, CrownIcon, PlayIcon } from '../components/icons'

/**
 * Demo sign-in, between the school card and the login form.
 *
 * Roles run left to right as a snapped carousel; the role in view lists the
 * seeded people behind it, and tapping one signs straight in. The role strip
 * above is the same selection by another route — tap a role and the carousel
 * scrolls to it, swipe the carousel and the strip follows.
 *
 * The cards carry only an email. The server holds the demo credential, so
 * nothing here can be replayed against a real account.
 */
export function DemoPickerScreen({
  groups,
  seeded,
  schoolAllowsDemo,
  onPick,
  onSeeded,
  busyEmail,
}: {
  groups: DemoPersonaGroup[]
  seeded: boolean
  schoolAllowsDemo: boolean
  onPick: (user: DemoPersonaUser) => void
  onSeeded: () => void
  busyEmail: string | null
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [showAllRoles, setShowAllRoles] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)

  // The strip shows a few roles at a time so it stays legible on a phone;
  // "View all roles" drops the cap rather than opening a second screen.
  const ROLES_IN_STRIP = 3
  const visibleRoles = useMemo(
    () => (showAllRoles ? groups : groups.slice(0, ROLES_IN_STRIP)),
    [groups, showAllRoles],
  )

  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    requestAnimationFrame(() => {
      setActive(activePanelIndex(track.scrollLeft, track.clientWidth, groups.length))
    })
  }, [groups.length])

  // A role can disappear between loads when a school is switched off, which
  // would otherwise leave the active index past the end of the list.
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(groups.length - 1, 0)))
  }, [groups.length])

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current
      if (!track) return
      track.scrollTo({
        left: panelScrollOffset(index, track.clientWidth, groups.length),
        behavior: 'smooth',
      })
      // Snap scrolling is asynchronous; setting this now keeps the strip and
      // dots in step with the tap instead of lagging a frame behind.
      setActive(stepPanel(index, 0, groups.length))
    },
    [groups.length],
  )

  async function loadDemoData() {
    setSeeding(true)
    setSeedError(null)
    try {
      await api.seedDemo()
      onSeeded()
    } catch (err) {
      setSeedError(err instanceof ApiError ? err.message : 'Could not load the demo data')
    } finally {
      setSeeding(false)
    }
  }

  // Switched off for this school by a system owner. Say so plainly: the
  // remedy is an administrator, not anything the visitor can do here.
  if (!schoolAllowsDemo) {
    return (
      <div className="info-note">
        <span className="info-note-icon" aria-hidden="true">
          i
        </span>
        <p>
          Demo mode is disabled for this school by the administrator. Use your own login
          credentials to access the system.
        </p>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="info-note">
        <span className="info-note-icon" aria-hidden="true">
          i
        </span>
        {seeded ? (
          <p>
            Demo mode is on, but no school has it switched on yet. A system owner can enable a
            school from the back office.
          </p>
        ) : (
          <div>
            <p style={{ margin: 0 }}>Demo mode is on, but this deployment has no demo data yet.</p>
            {seedError && <div className="error-banner">{seedError}</div>}
            <button
              type="button"
              className="btn-ghost"
              disabled={seeding}
              onClick={loadDemoData}
              style={{ marginTop: 10 }}
            >
              {seeding ? 'Loading demo data…' : 'Load demo data'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="role-strip" role="tablist" aria-label="Demo roles">
        {visibleRoles.map((group) => {
          const index = groups.indexOf(group)
          const selected = index === active
          return (
            <button
              key={group.role}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`role-chip${selected ? ' is-active' : ''}`}
              onClick={() => goTo(index)}
            >
              <CapIcon />
              <span>{group.label}</span>
            </button>
          )
        })}
      </div>

      <div className="section-head">
        <h2>Demo Accounts</h2>
        {groups.length > ROLES_IN_STRIP && (
          <button type="button" className="link-action" onClick={() => setShowAllRoles((v) => !v)}>
            {showAllRoles ? 'Show fewer' : 'View All Roles'}
          </button>
        )}
      </div>

      <div className="persona-carousel">
        <button
          type="button"
          className="carousel-arrow"
          aria-label="Previous role"
          disabled={active === 0}
          onClick={() => goTo(stepPanel(active, -1, groups.length))}
        >
          <ChevronIcon direction="left" />
        </button>

        <div className="persona-track" ref={trackRef} onScroll={onScroll}>
          {groups.map((group, groupIndex) => (
            <div
              className="persona-panel"
              key={group.role}
              role="group"
              aria-label={`${group.label} demo accounts`}
            >
              {group.users.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  className={`persona-card${groupIndex === active ? ' is-featured' : ''}`}
                  disabled={busyEmail !== null}
                  onClick={() => onPick(user)}
                >
                  {groupIndex === active && (
                    <span className="persona-crown" aria-hidden="true">
                      <CrownIcon />
                    </span>
                  )}
                  <span className="persona-avatar">{initials(user.name)}</span>
                  <span className="persona-name">{user.name}</span>
                  <span className="persona-school">{user.schoolName ?? group.label}</span>
                  <span className="persona-blurb">
                    {busyEmail === user.email ? 'Signing in…' : user.subtitle}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="carousel-arrow"
          aria-label="Next role"
          disabled={active === groups.length - 1}
          onClick={() => goTo(stepPanel(active, 1, groups.length))}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <div className="carousel-dots">
        {groups.map((group, index) => (
          <button
            key={group.role}
            type="button"
            className={`carousel-dot${index === active ? ' is-active' : ''}`}
            aria-label={group.label}
            aria-current={index === active}
            onClick={() => goTo(index)}
          />
        ))}
      </div>

      <div className="demo-cta">
        <span className="demo-cta-icon" aria-hidden="true">
          <PlayIcon />
        </span>
        <span className="demo-cta-text">
          <strong>Click a Demo Account to Login</strong>
          <small>Explore the system with real sample data</small>
        </span>
        <ChevronIcon direction="right" />
      </div>
    </>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
