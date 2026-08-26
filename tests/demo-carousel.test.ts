import { describe, expect, it } from "vitest";
import * as mobile from "../web/mobile-app/src/lib/carousel.js";
import * as backOffice from "../web/back-office/src/lib/carousel.js";

/**
 * The demo role carousel exists in both apps, and each keeps its own copy of
 * the index arithmetic — the two frontends are separate builds with no shared
 * package. Running both copies through one table is what stops them drifting:
 * a change to either that alters behaviour fails here.
 */
const implementations = [
  ["mobile app", mobile],
  ["back office", backOffice],
] as const;

describe.each(implementations)("demo carousel (%s)", (_name, carousel) => {
  const { activePanelIndex, panelScrollOffset, stepPanel } = carousel;

  describe("which panel is in view", () => {
    it("reads the panel from the scroll position", () => {
      expect(activePanelIndex(0, 300, 5)).toBe(0);
      expect(activePanelIndex(300, 300, 5)).toBe(1);
      expect(activePanelIndex(1200, 300, 5)).toBe(4);
    });

    it("snaps to the nearer panel mid-swipe", () => {
      expect(activePanelIndex(140, 300, 5)).toBe(0);
      expect(activePanelIndex(160, 300, 5)).toBe(1);
    });

    it("clamps rubber-banding past either end", () => {
      // iOS lets you drag beyond the first and last panel; the heading and
      // dots must not follow the overscroll off the end of the list.
      expect(activePanelIndex(-80, 300, 5)).toBe(0);
      expect(activePanelIndex(9000, 300, 5)).toBe(4);
    });

    it("answers 0 before the scroller has been laid out", () => {
      // A hidden or unmounted container reports clientWidth 0; dividing by it
      // would yield NaN or Infinity and put the dots in an impossible state.
      expect(activePanelIndex(0, 0, 5)).toBe(0);
      expect(activePanelIndex(250, 0, 5)).toBe(0);
    });

    it("handles there being no roles at all", () => {
      expect(activePanelIndex(0, 300, 0)).toBe(0);
    });
  });

  describe("scrolling to a panel", () => {
    it("offsets by whole panels", () => {
      expect(panelScrollOffset(0, 300, 5)).toBe(0);
      expect(panelScrollOffset(3, 300, 5)).toBe(900);
    });

    it("never targets a panel that is not there", () => {
      expect(panelScrollOffset(99, 300, 5)).toBe(1200);
      expect(panelScrollOffset(-2, 300, 5)).toBe(0);
      expect(panelScrollOffset(1, 300, 0)).toBe(0);
    });
  });

  describe("stepping with the arrows", () => {
    it("moves one role at a time", () => {
      expect(stepPanel(2, 1, 5)).toBe(3);
      expect(stepPanel(2, -1, 5)).toBe(1);
    });

    it("stops at the ends rather than wrapping", () => {
      // Wrapping would make the disabled arrow buttons a lie.
      expect(stepPanel(0, -1, 5)).toBe(0);
      expect(stepPanel(4, 1, 5)).toBe(4);
    });
  });
});

describe("the two copies agree", () => {
  it("returns identical results across a swept range", () => {
    for (let count = 0; count <= 7; count++) {
      for (let width of [0, 1, 300, 414]) {
        for (let scroll = -200; scroll <= 2400; scroll += 37) {
          expect(mobile.activePanelIndex(scroll, width, count)).toBe(
            backOffice.activePanelIndex(scroll, width, count),
          );
        }
        for (let index = -2; index <= 9; index++) {
          expect(mobile.panelScrollOffset(index, width, count)).toBe(
            backOffice.panelScrollOffset(index, width, count),
          );
          expect(mobile.stepPanel(index, 1, count)).toBe(backOffice.stepPanel(index, 1, count));
          expect(mobile.stepPanel(index, -1, count)).toBe(backOffice.stepPanel(index, -1, count));
        }
      }
    }
  });
});
