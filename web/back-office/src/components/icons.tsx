/**
 * Inline SVG icons for the back-office sign-in screen. Drawn rather than
 * imported so the app ships no icon font or sprite sheet; each inherits
 * currentColor, so the same glyph works on the navy header and inside a
 * violet chip without a second copy.
 */

export function CapIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 2 9l10 5 10-5-10-5Z" fill="currentColor" />
      <path
        d="M5 11.5V16c0 1.5 3.1 3 7 3s7-1.5 7-3v-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function BrandCap({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 50 36" fill="none" aria-hidden="true">
      <path d="M25 2 2 12l23 10 23-10L25 2Z" fill="currentColor" />
      <path d="M11 17v9c0 2.5 6.3 5 14 5s14-2.5 14-5v-9l-14 6-14-6Z" fill="currentColor" />
    </svg>
  )
}

export function ChevronIcon({
  direction = 'right',
  size = 20,
}: {
  direction?: 'left' | 'right'
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PersonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BriefcaseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7.5" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function BuildingIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 21V8l8-4 8 4v13" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M2 21h20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="10.2" y="14" width="3.6" height="7" rx="0.6" fill="currentColor" />
    </svg>
  )
}

export function SwapIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h13l-3-3M20 16H7l3 3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LoginIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M15 8l4 4-4 4M19 12H9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GearIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="10" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function EyeIcon({ off = false, size = 18 }: { off?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
      {off && <path d="m4 20 16-16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
    </svg>
  )
}

/** Picks a glyph for a role without needing an icon per role name. */
export function RoleIcon({ role, size = 18 }: { role: string; size?: number }) {
  if (role === 'SUPER_USER') return <BuildingIcon size={size} />
  if (role === 'SUPPORT') return <BriefcaseIcon size={size} />
  return <PersonIcon size={size} />
}
