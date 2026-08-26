/**
 * Paths the offline app shell must never answer for.
 *
 * The service worker's navigation fallback serves the precached index.html to
 * any request the browser marks `mode: "navigate"` — which includes typing a
 * URL into the address bar. Left unrestricted it swallows the whole origin:
 * opening /api/health returns the mobile app, which then redirects to /login,
 * and the API looks broken while being perfectly healthy. The back-office is
 * a separate build at /admin and would be shadowed the same way.
 *
 * Kept free of Vite imports so the routing rules can be tested directly.
 */
export const NAVIGATION_FALLBACK_DENYLIST: RegExp[] = [
  /^\/api(\/|$)/,
  /^\/admin(\/|$)/,
];

/** True when the path must reach the network instead of the app shell. */
export function bypassesAppShell(pathname: string): boolean {
  return NAVIGATION_FALLBACK_DENYLIST.some((pattern) => pattern.test(pathname));
}
