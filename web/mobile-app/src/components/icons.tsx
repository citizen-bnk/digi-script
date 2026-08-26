/**
 * Inline SVG icons for the login screen. Drawn rather than imported so the
 * app ships no icon font or sprite sheet — each is a handful of bytes and
 * inherits currentColor, which is what lets the same glyph sit on the navy
 * header and inside a violet chip without a second copy.
 */

export function CapIcon({ size = 18 }: { size?: number }) {
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

export function SchoolIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 2.6 17 4l-5 1.4V2.6Z" fill="currentColor" />
      <path
        d="M4 21V9.5l8-3.2 8 3.2V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M2 21h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="10" y="14" width="4" height="7" rx="0.6" fill="currentColor" />
      <rect x="6.5" y="11" width="2.6" height="2.6" rx="0.5" fill="currentColor" />
      <rect x="14.9" y="11" width="2.6" height="2.6" rx="0.5" fill="currentColor" />
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

export function CrownIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 8.5 6.5 12 12 5l5.5 7L21 8.5V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M10 8.2 16 12l-6 3.8V8.2Z" fill="#fff" />
    </svg>
  )
}

export function UserIcon({ size = 18 }: { size?: number }) {
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

/** The wordmark cap that sits above "DigiScript" in the header. */
export function BrandCap({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 50 36" fill="none" aria-hidden="true">
      <path d="M25 2 2 12l23 10 23-10L25 2Z" fill="currentColor" />
      <path d="M11 17v9c0 2.5 6.3 5 14 5s14-2.5 14-5v-9l-14 6-14-6Z" fill="currentColor" />
    </svg>
  )
}
