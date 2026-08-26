/**
 * Which panel a horizontally snapping scroller is showing.
 *
 * The carousel is a native scroll-snap container rather than a JS-driven
 * slider, so the browser owns the gesture — touch swipe, trackpad, shift+wheel
 * and keyboard all work without us reimplementing momentum. That leaves one
 * thing to compute: which panel the scroll position corresponds to, so the
 * heading and the dots can follow the swipe.
 *
 * An identical copy of this file lives in each app; tests/demo-carousel.test.ts
 * runs both through the same table so the two cannot drift apart.
 */

/** The panel nearest to resting position, clamped to the available panels. */
export function activePanelIndex(scrollLeft: number, panelWidth: number, count: number): number {
  if (count <= 0) return 0
  // A zero width means the scroller has not been laid out yet (an unmounted
  // or display:none container). Guessing an index from it would divide by
  // zero; the first panel is the honest answer until layout happens.
  if (!Number.isFinite(panelWidth) || panelWidth <= 0) return 0
  const index = Math.round(scrollLeft / panelWidth)
  return Math.min(Math.max(index, 0), count - 1)
}

/** Where to scroll to bring `index` into view, clamped to real panels. */
export function panelScrollOffset(index: number, panelWidth: number, count: number): number {
  if (count <= 0 || panelWidth <= 0) return 0
  return Math.min(Math.max(index, 0), count - 1) * panelWidth
}

/** Step one panel along, stopping at the ends rather than wrapping. */
export function stepPanel(current: number, delta: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(Math.max(current + delta, 0), count - 1)
}
