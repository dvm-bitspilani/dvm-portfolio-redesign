// The live mark's controller and its React context (no components here; chrome/mark.jsx mounts
// the box and the canvas). The controller poses one fixed box imperatively (no React work per
// frame) and decides, per source, how the shared runtime renders:
//   menu   (the well, materialising in place)  > owner (the home hero)  > nobody (hidden).
import { createContext, useContext } from "react";
import { gsap } from "gsap";
import { MARK_K } from "./holo/runtime";
import { DOCK_PITCH, DOCK_YAW, Z } from "./markData";
import { setStaticMark } from "./shell";
import { clamp01 } from "../lib/math";

const LIVE_FPS = 60;
/** The canvas renders at about the box's own size (rounded up to RES_STEP css px), so the
 *  hologram's points, grain and scanlines read the same as at the box's displayed size; it is
 *  re-allocated only when the box outgrows it or shrinks under RES_SHRINK of it. */
const RES_STEP = 32;
const RES_SHRINK = 0.45;

/**
 * @typedef {{ x: number, y: number, h: number, yaw: number, pitch: number, op: number, z: number }} MarkPose
 *   Centre (viewport px), mark height (px), turn, opacity and stacking layer of the live mark.
 * @typedef {{ fps?: number, driven?: boolean }} OwnerProps
 *   `fps`: frames per second while visible (0 = only on demand); `driven`: the owner's stage
 *   writes the shared signal (chrome/holo/runtime.ts MarkRuntime.driven).
 * @typedef {{ id: string, pose: MarkPose | null, props: OwnerProps }} MarkOwner
 * @typedef {{ yaw: number, pitch: number, lift: number }} MenuState
 * @typedef {{ el: HTMLElement, bar: HTMLElement | null, state: MenuState, tween: gsap.core.Tween | null,
 *   op: number, last: { left: number, top: number, width: number, height: number } | null }} MenuSource
 */

function readDock() {
  const el = document.querySelector("[data-v8-mark-slot]");
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.height > 4) return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
  }
  // no bar laid out yet: an estimate of the slot, not cached (see dockPose)
  const W = window.innerWidth;
  const mobile = W <= 759;
  const gutter = mobile ? 20 : Math.min(64, Math.max(20, W * 0.045));
  return { x: gutter + 15, y: mobile ? 32 : 36, h: 38, estimate: true };
}

export class MarkController {
  /** @type {HTMLElement | null} the fixed box */
  box = null;
  /** @type {HTMLElement | null} the canvas wrapper inside the box (quantised resolution) */
  wrap = null;
  /** @type {import("./holo/runtime").MarkRuntime | null} */
  rt = null;
  /** @type {MarkOwner | null} */
  owner = null;
  /** @type {MenuSource | null} */
  menu = null;
  /** @type {gsap.core.Tween | null} the menu's materialise / dematerialise tween */
  morph = null;
  /** @type {MarkPose | null} the last rendered pose */
  cur = null;
  reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** WebGL is unavailable / lost: the box shows the static fallback print instead. */
  failed = false;
  lastSize = 0;
  res = 0;
  dock = null;

  dockPose() {
    let d = this.dock;
    if (!d) {
      d = readDock();
      if (!d.estimate) this.dock = d;
    }
    return { x: d.x, y: d.y, h: d.h, yaw: DOCK_YAW, pitch: DOCK_PITCH, op: 1, z: Z.dock };
  }
  remeasure() {
    this.dock = null;
    this.apply();
  }
  /** @returns {MarkPose} */
  menuPose() {
    const m = this.menu;
    // the well unmounts with the menu while the mark is still dematerialising: hold the last spot
    if (m.el.isConnected || !m.last) {
      const r = m.el.getBoundingClientRect();
      m.last = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    const r = m.last;
    const h = Math.min(r.height * 0.56, r.width * 0.62);
    // the menu scrolls (phones): the mark fades as its well leaves the area under the menu's bar,
    // so it never floats over the list or the bar
    const top = m.bar?.isConnected ? m.bar.getBoundingClientRect().bottom : 0;
    const shown = Math.min(r.top + r.height, window.innerHeight) - Math.max(r.top, top);
    const vis = clamp01(shown / Math.max(1, r.height * 0.5) - 0.5);
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height * 0.47 - m.state.lift * h * 0.05,
      h,
      yaw: m.state.yaw,
      pitch: m.state.pitch,
      op: m.op * vis,
      z: Z.menu,
    };
  }
  /** @returns {MarkPose} */
  desired() {
    if (this.menu?.el) return this.menuPose();
    if (this.owner?.pose) return this.owner.pose;
    // nobody owns it: the bar shows the static print, the live box is hidden
    return { ...this.dockPose(), op: 0 };
  }
  owns(id) {
    return !!this.owner && this.owner.id === id;
  }
  /** Render rate + who drives the signal, for the current source. */
  syncProps() {
    const rt = this.rt;
    if (!rt) return;
    if (this.menu) {
      rt.fps = LIVE_FPS;
      rt.driven = false;
    } else if (this.owner) {
      rt.fps = this.owner.props.fps ?? LIVE_FPS;
      rt.driven = !!this.owner.props.driven;
    } else {
      rt.fps = 0;
      rt.driven = false;
    }
    rt.wake();
  }

  apply() {
    const p = this.desired();
    this.render(p, p.z);
  }

  /** @param {MarkPose} p @param {number} z */
  render(p, z) {
    this.cur = p;
    const box = this.box;
    if (!box) return;
    const size = Math.max(8, Math.round(MARK_K * p.h));
    if (size !== this.lastSize) {
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      this.lastSize = size;
      // canvas resolution: quantised so a flight reallocates a handful of times, not per frame.
      // R3F measures the wrapper's untransformed size (HoloMarkCanvas `resize.offsetSize`), so
      // the drawing buffer is `res` × DPR and only the CSS scale below follows the box.
      const wrap = this.wrap;
      if (wrap) {
        let res = this.res;
        if (!res || size > res || size < res * RES_SHRINK) {
          // (capped: the hero-size box is CSS-downscaled from at most 1024 css px, which with the
          // DPR cap keeps the bloom chain around the lab hero's budget)
          const cap = this.rt?.narrow ? 768 : 1024;
          res = Math.max(64, Math.min(cap, Math.ceil(size / RES_STEP) * RES_STEP));
          this.res = res;
          wrap.style.width = `${res}px`;
          wrap.style.height = `${res}px`;
        }
        const k = size / res;
        wrap.style.transform = `scale(${k.toFixed(5)})`;
        // point sprites are sized in buffer px: keep them at their on-screen size
        if (this.rt) this.rt.displayScale = k;
      }
    }
    box.style.transform = `translate3d(${(p.x - size / 2).toFixed(1)}px, ${(p.y - size / 2).toFixed(1)}px, 0)`;
    const op = clamp01(p.op);
    const hidden = op < 0.01;
    box.style.opacity = op.toFixed(3);
    box.style.visibility = hidden ? "hidden" : "visible";
    box.style.zIndex = String(z);
    const rt = this.rt;
    if (rt) {
      rt.yaw = p.yaw;
      rt.pitch = p.pitch;
      // an invisible mark costs no frames (HoloMarkCanvas Ticker sleeps while `hidden`)
      rt.hidden = hidden || this.failed;
      if (!rt.hidden) {
        rt.wake();
        if (rt.fps < 30) rt.invalidate();
      }
    }
  }

  /** The live hologram cannot render (no WebGL, context lost): show the static print instead. */
  setFailed(failed) {
    if (this.failed === failed) return;
    this.failed = failed;
    this.apply();
  }

  /** Follow the OS reduced-motion setting while the variant is open. */
  setReduced(reduced) {
    if (this.reduced === reduced) return;
    this.reduced = reduced;
    if (this.rt) this.rt.reduced = reduced;
    // land any menu morph / pose tween in its end state
    this.morph?.progress(1);
    this.menu?.tween?.progress(1);
    this.rt?.invalidate();
  }

  // ---- owner API (home page). No flights: the hero's own boot is the entrance.
  /** @param {string} id @param {OwnerProps} [props] @param {MarkPose | null} [pose] */
  claim(id, props = {}, pose = null) {
    this.owner = { id, props, pose };
    this.syncProps();
    this.apply();
  }
  release(id) {
    if (!this.owner || (id && this.owner.id !== id)) return;
    this.owner = null;
    setStaticMark(1);
    this.syncProps();
    this.apply();
  }
  /** @param {string} id @param {MarkPose} pose */
  push(id, pose) {
    if (!this.owns(id)) return;
    this.owner.pose = pose;
    if (!this.menu) this.apply();
  }
  /** @param {string} id @param {OwnerProps} props */
  setOwnerProps(id, props) {
    if (!this.owns(id)) return;
    this.owner.props = { ...this.owner.props, ...props };
    this.syncProps();
    if (!this.menu) this.apply();
  }

  // ---- menu API: the hologram materialises in the well (the bar keeps its static print)
  /** @param {HTMLElement} el the well @param {Partial<MenuState>} state @param {HTMLElement | null} [bar] the menu's bar (the mark fades under it) */
  openMenu(el, state, bar = null) {
    this.morph?.kill();
    this.menu?.tween?.kill();
    this.menu = { el, bar, state: { yaw: 0.1, pitch: -0.1, lift: 0, ...state }, tween: null, op: 0, last: null };
    const rt = this.rt;
    this.syncProps();
    this.apply();
    const m = this.menu;
    const sig = rt.signal;
    if (this.reduced) {
      sig.build = 1;
      sig.scatter = 0;
      this.morph = gsap.to(m, { op: 1, duration: 0.15, ease: "none", onUpdate: () => this.menu === m && this.apply() });
      return;
    }
    // the same look as the hero boot, in place: scattered points gather into the mark
    rt.morph = true;
    sig.scatter = 1.2;
    sig.build = 0;
    const st = { b: 0 };
    this.morph = gsap.to(st, {
      b: 1,
      duration: 0.8,
      ease: "power3.out",
      onUpdate: () => {
        if (this.menu !== m) return;
        sig.build = st.b;
        sig.scatter = (1 - st.b) * 1.2;
        m.op = Math.min(1, st.b * 3);
        this.apply();
      },
      onComplete: () => {
        rt.morph = false;
      },
    });
  }
  /** @param {Partial<MenuState>} state */
  setMenu(state) {
    const m = this.menu;
    if (!m) return;
    m.tween?.kill();
    if (this.reduced) {
      Object.assign(m.state, state);
      this.apply();
      return;
    }
    m.tween = gsap.to(m.state, { ...state, duration: 0.7, ease: "power3.out", onUpdate: () => this.menu === m && this.apply() });
  }
  closeMenu() {
    const m = this.menu;
    if (!m) return;
    m.tween?.kill();
    this.morph?.kill();
    const rt = this.rt;
    const sig = rt.signal;
    const done = () => {
      if (this.menu !== m) return;
      this.menu = null;
      this.morph = null;
      rt.morph = false;
      this.syncProps();
      this.apply();
    };
    if (this.reduced) {
      this.morph = gsap.to(m, { op: 0, duration: 0.15, ease: "none", onUpdate: () => this.menu === m && this.apply(), onComplete: done });
      return;
    }
    rt.morph = true;
    const st = { b: 1, op: m.op };
    this.morph = gsap.to(st, {
      b: 0,
      op: 0,
      duration: 0.35,
      ease: "power2.in",
      onUpdate: () => {
        if (this.menu !== m) return;
        sig.build = 0.2 + 0.8 * st.b;
        sig.scatter = (1 - st.b) * 0.8;
        m.op = st.op;
        this.apply();
      },
      onComplete: done,
    });
  }

  dispose() {
    this.morph?.kill();
    this.menu?.tween?.kill();
    this.box = null;
    this.wrap = null;
  }
}

/** @type {import("react").Context<MarkController | null>} */
export const MarkContext = createContext(null);
/** The variant's one live mark controller (null outside V8's shell). */
export const useMark = () => useContext(MarkContext);
