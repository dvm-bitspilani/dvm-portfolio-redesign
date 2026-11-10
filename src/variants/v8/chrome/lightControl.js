// The room's one pool of light (direction §2.3). A single fixed gradient layer (rendered by
// chrome/Room.jsx), a radial gradient at --lx / --ly / --lr; this controller moves it. Same owner model
// as the live mark (chrome/markControl.js):
//   - sections declare where the pool sits while they hold the viewport centre:
//     data-light="82% 30% 36vw" (x, y of the viewport; radius in vw / vh / px);
//   - an owner (the hero, the Teams strip) may claim it and push positions every frame;
//     the pool blends from the declared spot to the owner's and back on release.
// Styles are written imperatively (quickTo / style.setProperty); React never renders per frame.
// Controller, context and hook here; the provider (listeners, lifetime) is chrome/Light.jsx.
import { createContext, useContext } from "react";
import { gsap } from "gsap";

/** Layer opacity at rest; an owner's `f` scales it. */
const BASE = 0.8;
const GLIDE = 0.9;
const BLEND = 0.6;

function toPx(v, ref, W, H) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  if (v.endsWith("%")) return (n / 100) * ref;
  if (v.endsWith("vw")) return (n / 100) * W;
  if (v.endsWith("vh")) return (n / 100) * H;
  return n;
}

/** "x y r" → px in the viewport. Phones get a wider pool (a 36vw circle is a speck at 390px). */
function parseSpot(str, W = window.innerWidth, H = window.innerHeight) {
  const [x = "50%", y = "45%", r = "34vw"] = String(str || "").trim().split(/\s+/);
  let rr = toPx(r, W, W, H) ?? W * 0.34;
  if (W < 760) rr = Math.max(rr, W * 0.7);
  return { x: toPx(x, W, W, H) ?? W / 2, y: toPx(y, H, W, H) ?? H * 0.45, r: rr };
}

export class LightController {
  el = null;
  reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** the declared spot, tweened between sections */
  spot = { x: 0, y: 0, r: 400 };
  /** the owner's latest push */
  own = { x: 0, y: 0, r: 400, f: 1 };
  mix = { v: 0 };
  owner = null;
  decl = null;
  declStr = "";
  q = null;

  constructor() {
    if (typeof window === "undefined") return;
    Object.assign(this.spot, parseSpot("50% 45% 34vw"));
  }

  /** The glide setters (created on first use, again after dispose()). */
  quick() {
    if (!this.q && typeof window !== "undefined") {
      const opts = { duration: GLIDE, ease: "power2.out", onUpdate: () => this.paint() };
      this.q = { x: gsap.quickTo(this.spot, "x", opts), y: gsap.quickTo(this.spot, "y", opts), r: gsap.quickTo(this.spot, "r", opts) };
    }
    return this.q;
  }

  attach(el) {
    this.el = el;
    this.paint();
  }

  paint() {
    const el = this.el;
    if (!el) return;
    const m = this.mix.v;
    const s = this.spot;
    const o = this.own;
    const x = s.x + (o.x - s.x) * m;
    const y = s.y + (o.y - s.y) * m;
    const r = s.r + (o.r - s.r) * m;
    el.style.setProperty("--lx", `${x.toFixed(1)}px`);
    el.style.setProperty("--ly", `${y.toFixed(1)}px`);
    el.style.setProperty("--lr", `${Math.max(1, r).toFixed(0)}px`);
    el.style.opacity = (BASE * (1 + (o.f - 1) * m)).toFixed(3);
  }

  /** Move the declared pool to a section's spot (snap when reduced or `instant`). */
  declare(str, instant = false) {
    const t = parseSpot(str);
    const q = this.quick();
    if (instant || this.reduced || !q) {
      // snap: start = end, so any glide in flight lands here at once
      if (q) {
        q.x(t.x, t.x);
        q.y(t.y, t.y);
        q.r(t.r, t.r);
      }
      Object.assign(this.spot, t);
      this.paint();
      return;
    }
    q.x(t.x);
    q.y(t.y);
    q.r(t.r);
  }

  /** Which [data-light] holds the viewport centre? */
  scan() {
    if (typeof document === "undefined") return;
    const c = window.innerHeight / 2;
    let hit = null;
    for (const el of document.querySelectorAll("[data-light]")) {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.top <= c && r.bottom >= c) hit = el;
    }
    if (!hit) return;
    const str = hit.getAttribute("data-light") || "";
    if (hit === this.decl && str === this.declStr) return;
    const first = !this.decl;
    this.decl = hit;
    this.declStr = str;
    this.declare(str, first);
  }

  resize() {
    if (this.declStr) this.declare(this.declStr, true);
  }

  // ---- owner API
  claim(id, spot) {
    if (spot) Object.assign(this.own, { f: 1, ...spot });
    if (this.owner === id) return;
    this.owner = id;
    gsap.to(this.mix, { v: 1, duration: this.reduced ? 0 : BLEND, ease: "power2.out", overwrite: true, onUpdate: () => this.paint(), onComplete: () => this.paint() });
  }
  push(id, spot) {
    if (this.owner !== id) return;
    Object.assign(this.own, spot);
    this.paint();
  }
  release(id) {
    if (this.owner !== id) return;
    this.owner = null;
    gsap.to(this.mix, { v: 0, duration: this.reduced ? 0 : BLEND, ease: "power2.out", overwrite: true, onUpdate: () => this.paint(), onComplete: () => this.paint() });
  }
  owns(id) {
    return this.owner === id;
  }

  /** Follow the OS reduced-motion setting while the variant is open. */
  setReduced(reduced) {
    this.reduced = reduced;
  }

  /** Leaving V8: stop every tween that still points at this controller. */
  dispose() {
    if (this.q) {
      this.q.x.tween.kill();
      this.q.y.tween.kill();
      this.q.r.tween.kill();
      this.q = null;
    }
    gsap.killTweensOf(this.mix);
    this.owner = null;
    this.el = null;
  }
}

/** @type {import("react").Context<LightController | null>} */
export const LightContext = createContext(null);
export const useLight = () => useContext(LightContext);
