import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'
import { activePanelIndex, panelScrollOffset, stepPanel } from '../lib/carousel'
import {
  CapIcon,
  ChevronIcon,
  GearIcon,
  LoginIcon,
  PersonIcon,
  RoleIcon,
  SwapIcon,
} from '../components/icons'

/**
 * Demo sign-in for the back office, in two steps.
 *
 * Step one lists the roles as a snapped carousel — swipe, arrows or a tap on
 * a chip — with the accounts behind the role in view. Step two gives the
 * chosen role a screen of its own, one row per person with an explicit Login
 * button, since a demonstrator picking a person is committing to something
 * and a whole-row tap is easy to trigger by accident on a trackpad.
 *
 * The rows carry only an email. The server holds the demo credential, so
 * nothing here can be replayed against a real account.
 */
export default function DemoPicker({
  groups,
  seeded,
  onPick,
  onSeeded,
  busyEmail,
}: {
  groups: DemoPersonaGroup[]
  seeded: boolean
  onPick: (user: DemoPersonaUser) => void
  onSeeded: () => void
  busyEmail: string | null
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [openRole, setOpenRole] = useState<string | null>(null)
  const [showAllRoles, setShowAllRoles] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)

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
      // Snap scrolling is asynchronous; setting this now keeps the chips and
      // the account list in step with the click rather than a frame behind.
      setActive(stepPanel(index, 0, groups.length))
    },
    [groups.length],
  )

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    goTo(stepPanel(active, event.key === 'ArrowRight' ? 1 : -1, groups.length))
  }

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

  if (groups.length === 0) {
    return (
      <div className="info-note">
        <span className="info-note-icon" aria-hidden="true">
          i
        </span>
        {seeded ? (
          <p>
            Demo mode is switched off for every school. Switch one back on from Schools once you
            are signed in as a system owner.
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

  const opened = groups.find((group) => group.role === openRole) ?? null

  // ---- step two: the chosen role's people ----
  if (opened) {
    return (
      <section className="demo-step">
        <div className="role-banner">
          <span className="role-banner-icon">
            <PersonIcon size={22} />
          </span>
          <span className="role-banner-text">
            <strong>{opened.label} Demo Accounts</strong>
            <small>Explore the system as a {opened.label}</small>
          </span>
          <button type="button" className="btn-outline" onClick={() => setOpenRole(null)}>
            <SwapIcon />
            Change Role
          </button>
        </div>

        <div className="section-head">
          <h2>Available Demo Users</h2>
          <button
            type="button"
            className="link-action"
            onClick={() => setShowCredentials((v) => !v)}
          >
            {showCredentials ? 'Hide Credentials' : 'View Credentials'}
          </button>
        </div>

        {showCredentials && (
          <div className="info-note subtle">
            <span className="info-note-icon" aria-hidden="true">
              i
            </span>
            <p>
              Demo accounts sign in without a password. The credential stays on the server and is
              never sent to the browser, so there is nothing here to copy — press Login on any
              user instead.
            </p>
          </div>
        )}

        <div className="user-rows">
          {opened.users.map((user) => (
            <div className="user-row" key={user.email}>
              <span className="user-avatar">
                <PersonIcon size={22} />
              </span>
              <span className="user-row-text">
                <strong>{user.name}</strong>
                <small>{user.schoolName ?? 'District office'}</small>
                <small className="muted">{user.subtitle}</small>
              </span>
              <button
                type="button"
                className="btn-login-sm"
                disabled={busyEmail !== null}
                onClick={() => onPick(user)}
              >
                <LoginIcon />
                {busyEmail === user.email ? 'Signing in…' : 'Login'}
              </button>
            </div>
          ))}
        </div>

        <div className="info-note">
          <span className="info-note-icon" aria-hidden="true">
            i
          </span>
          <p>
            <strong>Demo Mode Active</strong>
            <br />
            You are in demo mode for {opened.label}s. Click “Login” on any user to automatically
            access the system.
          </p>
        </div>

        <div className="admin-row">
          <span className="admin-row-icon">
            <GearIcon />
          </span>
          <span className="admin-row-text">
            <strong>Disable Demo Mode</strong>
            <small>Turn off demo accounts for this school (Admin Only)</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            aria-label="Disable demo mode (system owners only)"
            className="switch"
            // Demo mode is a per-school setting a system owner changes from
            // Schools. Nobody signed out may flip it, so this reports the
            // control's existence without offering it.
            disabled
            title="Sign in as a system owner to change this"
          />
        </div>
      </section>
    )
  }

  // ---- step one: roles, and the accounts behind the role in view ----
  const current = groups[active] ?? groups[0]

  return (
    <section className="demo-step">
      <div className="section-head">
        <h2>Demo Accounts</h2>
        {groups.length > ROLES_IN_STRIP && (
          <button type="button" className="link-action" onClick={() => setShowAllRoles((v) => !v)}>
            {showAllRoles ? 'Show fewer' : 'View All Roles'}
          </button>
        )}
      </div>

      <div className="role-carousel">
        <button
          type="button"
          className="carousel-arrow"
          aria-label="Previous role"
          disabled={active === 0}
          onClick={() => goTo(stepPanel(active, -1, groups.length))}
        >
          <ChevronIcon direction="left" />
        </button>

        <div
          className="role-track"
          ref={trackRef}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          aria-label="Demo roles"
        >
          {groups.map((group, index) => (
            <div className="role-slot" key={group.role}>
              <button
                type="button"
                className={`role-chip${index === active ? ' is-active' : ''}`}
                aria-current={index === active}
                onClick={() => (index === active ? setOpenRole(group.role) : goTo(index))}
              >
                <RoleIcon role={group.role} />
                <span>{group.label}</span>
              </button>
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

      {visibleRoles.length < groups.length && (
        <p className="role-count">
          Showing {visibleRoles.length} of {groups.length} roles
        </p>
      )}

      <div className="account-rows">
        {current.users.map((user) => (
          <button
            key={user.email}
            type="button"
            className="account-row"
            disabled={busyEmail !== null}
            onClick={() => onPick(user)}
          >
            <span className="user-avatar">
              <PersonIcon size={22} />
            </span>
            <span className="user-row-text">
              <strong>
                {user.schoolName ?? 'District Office'} – {current.label} (Demo)
              </strong>
              <small>{user.name}</small>
              <small className="muted">
                {busyEmail === user.email ? 'Signing in…' : user.subtitle}
              </small>
            </span>
            <ChevronIcon />
          </button>
        ))}
      </div>

      <button type="button" className="role-open" onClick={() => setOpenRole(current.role)}>
        <CapIcon size={16} />
        See all {current.label} demo users
      </button>

      <div className="info-note">
        <span className="info-note-icon" aria-hidden="true">
          i
        </span>
        <p>
          Select a demo account to explore the back office features. You can switch roles to view
          demo accounts for {otherRoleNames(groups, current.role)}.
        </p>
      </div>
    </section>
  )
}

/** "Teachers and Office Admins" — the roles other than the one in view. */
function otherRoleNames(groups: DemoPersonaGroup[], currentRole: string): string {
  const names = groups.filter((g) => g.role !== currentRole).map((g) => `${g.label}s`)
  if (names.length === 0) return 'other roles'
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
