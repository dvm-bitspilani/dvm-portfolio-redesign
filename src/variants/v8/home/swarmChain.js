// The one particle swarm that runs from Legacy into Year by year (home/LegacyStory.jsx), and the
// look Legacy's swarm has had since V2 (legacy/LegacySwarm.jsx), so the two read alike. Legacy and
// Story reach the shared swarm through SwarmChainContext: Legacy says when a company is lit in its
// constellation (the mark dims one small step) while it owns the swarm,
// Story fades it as the dots settle into the folded paper and reports when the paper has taken
// over. The swarm only ever forms the mark here (round 11 removed the company-name morph: the
// cursor crossed it and it passed through a shapeless cloud on the way); hovering the constellation
// never moves, morphs or re-forms it.
import { createContext, useSyncExternalStore } from "react";
import { LOGO_ASPECT } from "../../../immersive/shared/logo";

/** Present only on the desktop home, where Legacy and Story share one swarm. */
export const SwarmChainContext = createContext(null);

/* ---- Legacy's swarm: the projector idling on the department's own slide */

/**
 * Where the mark sits: a region of the Legacy section's own box (fractions of its width and
 * height). Right of the alumni constellation, which keeps clear of it (Legacy.jsx), so no circle
 * sits on the mark and the cursor has no reason to cross it. Round 18 made it about two thirds of
 * its old area (at 1440 × 900 the formed mark is x 1012–1364, y 337–797) so the constellation, the
 * section's subject, gets the room. Spotlight.jsx lands the beam on its centre, and Legacy's
 * declared light (data-light) sits there too.
 */
export const LEGACY_PLACE = { x0: 0.68, y0: 0.34, x1: 0.97, y1: 0.92 };
/** How much of that region the mark fills (keeps it off the screen panel's edges). */
export const LEGACY_FILL = 0.88;
/** Idle brightness (multiplier). */
export const LEGACY_BRIGHTNESS = 0.5;
/** A company is lit in the constellation: the mark dims one small step (the engine eases it; the
 *  dots never move). */
export const LEGACY_ACTIVE = 0.42;
export const LEGACY_PARALLAX = 0.25;

/* ---- the folded paper mark of Year by year */

/** Vertical centre of the paper mark, as a fraction of the viewport. */
const PAPER_CY = 0.478;
/** Horizontal centre and height of the paper mark, as fractions of the viewport. */
const PAPER_CX = 0.497;
const PAPER_H = 0.6;
const PAPER_ASPECT = 0.77;

/**
 * Where the folded paper mark sits in a full-viewport FoldTimeline (startFolded, no intro), as
 * measured in V3 on screen. It follows from the kit's camera framing of the folded mark
 * (timeline/scene/frame.ts): re-measure if that changes. The chain's dots are carried onto this
 * rectangle so the paper fades in over them.
 */
export function paperRegion(w, h) {
  const mh = h * PAPER_H;
  const mw = mh * PAPER_ASPECT;
  const x = w * PAPER_CX - mw / 2;
  const y = h * PAPER_CY - mh / 2;
  return { x0: x / w, y0: y / h, x1: (x + mw) / w, y1: (y + mh) / h };
}

/**
 * The swarm's formed mark inside a canvas of w × h px for a placement region and fill: its centre
 * and height in px. Mirrors the swarm engine's fitting (the mark's aspect against the region's).
 */
export function markRect(region, fill, aspect, w, h) {
  const rw = (region.x1 - region.x0) * w;
  const rh = (region.y1 - region.y0) * h;
  return {
    cx: ((region.x0 + region.x1) / 2) * w,
    cy: ((region.y0 + region.y1) / 2) * h,
    h: Math.min(rh, rw / aspect) * fill,
  };
}

/**
 * The formed mark's box inside a Legacy section of w × h px (what LegacyStory / LegacySwarm draw),
 * in the section's px. `viewH`: on the desktop home the shared swarm's canvas is the viewport, and
 * the region is clipped to it (createSwarmChain().place) — pass the viewport's height there.
 * @returns {{ left: number, right: number, top: number, bottom: number, cx: number, cy: number, w: number, h: number }}
 */
export function legacyMarkBox(w, h, viewH) {
  const region = viewH ? { ...LEGACY_PLACE, y1: Math.min(viewH / h, LEGACY_PLACE.y1) } : LEGACY_PLACE;
  const m = markRect(region, LEGACY_FILL, LOGO_ASPECT, w, h);
  const mw = m.h * LOGO_ASPECT;
  return { left: m.cx - mw / 2, right: m.cx + mw / 2, top: m.cy - m.h / 2, bottom: m.cy + m.h / 2, cx: m.cx, cy: m.cy, w: mw, h: m.h };
}

/* ---- shared state */

/**
 * State shared by the swarm layer and the two sections it sits behind:
 *   storyDone   – Story: the paper has the mark, the swarm's WebGL field can go
 *   legacyOwns  – the layer: Legacy is on screen and may light a company (false just before the
 *                 glide starts: Legacy clears its selection)
 *   active      – Legacy: a company is hovered / selected; the mark dims one small step
 *   gen         – bumps each time a fresh field mounts (so effects replay onto its controller)
 */
export function createSwarmChain() {
  const listeners = new Set();
  const state = { storyDone: false, legacyOwns: true, active: false, gen: 0 };
  /** Measured by the layer: the Legacy section's height in px. */
  const geo = { legacyH: 0 };
  return {
    /** The SwarmField's controller (null while the field is unmounted). */
    swarm: { current: null },
    /** The layer Story fades out as the paper fades in. */
    fade: { current: null },
    geo,
    /**
     * LEGACY_PLACE in the shared layer's viewport-sized canvas: the same region of the Legacy
     * section, measured from the section's top (the canvas's top while Legacy is on screen).
     */
    place(w, h) {
      const k = (geo.legacyH || h) / h;
      return { x0: LEGACY_PLACE.x0, x1: LEGACY_PLACE.x1, y0: LEGACY_PLACE.y0 * k, y1: Math.min(1, LEGACY_PLACE.y1 * k) };
    },
    get: (key) => state[key],
    set(key, v) {
      if (state[key] === v) return;
      state[key] = v;
      listeners.forEach((f) => f());
    },
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
  };
}

const noSubscribe = () => () => {};

/** One value of the chain's state, re-rendering when it changes (undefined without a chain). */
export function useChainValue(chain, key) {
  return useSyncExternalStore(chain ? chain.subscribe : noSubscribe, () => (chain ? chain.get(key) : undefined));
}
