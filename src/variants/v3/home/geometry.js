import { useEffect, useState } from "react";
import { LOGO_ASPECT } from "../../../immersive/shared/logo";

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** smoothstep of x over [a, b] */
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;

/** Hero padding passed to <MercuryLogo fit={{ padding }}>, per viewport. */
export const heroPadding = (w) => (w < 760 ? 0.14 : 0.2);

/**
 * Screen rect of the mercury mark inside a w×h box for fit:{mode:'contain', padding}.
 * Mirrors kit/mercury/renderer.ts (margin 1.1, camera looking at the centre).
 */
export function mercuryMarkRect(w, h, padding = heroPadding(w)) {
  const avail = 1 - 2 * padding;
  const margin = 1.1;
  const aspect = w / h;
  const frac = Math.min(avail / margin, (avail * aspect) / (LOGO_ASPECT * margin));
  const mh = frac * h;
  const mw = mh * LOGO_ASPECT;
  return { x: (w - mw) / 2, y: (h - mh) / 2, w: mw, h: mh };
}

/** Rect (px) → swarm placement region (fractions). */
export const toRegion = (r, w, h) => ({ x0: r.x / w, y0: r.y / h, x1: (r.x + r.w) / w, y1: (r.y + r.h) / h });

/** Scale a rect about its centre. */
export const scaleRect = (r, k, dy = 0) => ({
  x: r.x + (r.w * (1 - k)) / 2,
  y: r.y + (r.h * (1 - k)) / 2 + dy * r.h,
  w: r.w * k,
  h: r.h * k,
});

export function useMedia(query) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setM(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [query]);
  return m;
}

/** SVG viewBox of the DVM mark's tight bounds (path coordinates from shared/logo.ts). */
export const LOGO_VIEWBOX = "-470.31 -227.2 250.53 326.78";
