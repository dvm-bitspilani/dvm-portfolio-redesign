// The V2 brand mark: ONE live MercuryLogo (one WebGL context) for the whole variant.
// It lives in a fixed box at the shell level and is posed by whoever owns it:
//   - the home page choreography (hero → glass beside About → collapse/flip → dock),
//   - the menu (flies into the menu's preview well and reacts to the hovered item),
//   - otherwise it sits docked in the navbar's mark slot ([data-v2-mark-slot]).
// The box is always a square of MARK_K × the mark height centred on the mark, with a
// fixed fit, so moving/shrinking it is just translate + size (no per-frame React work)
// and a one-frame resize lag is a uniform scale, i.e. invisible.
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { MercuryLogo } from "../../../immersive/kit/mercury";
import { GLASS_ENV } from "../lib/glass";
import s from "./mark.module.css";

export const MARK_K = 2.2;
const FIT = { mode: "height", padding: (1 - 1 / MARK_K) / 2 };
export const DOCK_YAW = 0.06;
export const DOCK_PITCH = -0.12;
export const Z = { page: 5, dock: 1001, transit: 10001, menu: 20001 };

const BASE_PROPS = {
  reflection: 0,
  backdrop: null,
  pointerTarget: "window",
  interactive: false,
  sheen: 0.9,
  tilt: 0.9,
  sway: 0.7,
};
const MENU_PROPS = { ...BASE_PROPS, interactive: true, tilt: 1.4, sway: 1, sheen: 1.15 };

const MarkContext = createContext(null);
export const useMark = () => useContext(MarkContext);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function readDock() {
  const el = document.querySelector("[data-v2-mark-slot]");
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.height > 4) return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
  }
  const W = window.innerWidth;
  const mobile = W <= 768;
  return { x: W * 0.04 + 18, y: window.innerHeight * (mobile ? 0.02 : 0.01) + 40, h: mobile ? 38 : 42 };
}

/** Plain controller: poses the fixed box + the renderer imperatively. */
class MarkController {
  box = null;
  merc = null; // ref object → MercuryLogoHandle
  owner = null; // { id, pose, props }
  menu = null; // { el, state: { yaw, pitch, prog, lift } }
  fly = null;
  cur = null;
  transit = false;
  reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  lastSize = 0;
  onProps = () => {};
  dock = null;

  dockPose() {
    if (!this.dock) this.dock = readDock();
    return { ...this.dock, yaw: DOCK_YAW, pitch: DOCK_PITCH, prog: 0, op: 1, z: Z.dock };
  }
  remeasure() {
    this.dock = null;
    this.apply();
  }
  menuPose() {
    const m = this.menu;
    const r = m.el.getBoundingClientRect();
    const h = Math.min(r.height * 0.56, r.width * 0.62);
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.47 - m.state.lift * h * 0.05, h, yaw: m.state.yaw, pitch: m.state.pitch, prog: m.state.prog, op: 1, z: Z.menu };
  }
  desired() {
    if (this.menu?.el) return this.menuPose();
    if (this.owner?.pose) return this.owner.pose;
    return this.dockPose();
  }
  source() {
    return this.menu ? "menu" : this.owner ? `owner:${this.owner.id}` : "dock";
  }
  props() {
    if (this.menu) return MENU_PROPS;
    const fps = this.owner || this.fly ? 0 : 30;
    return this.owner ? { ...BASE_PROPS, fps, ...this.owner.props } : { ...BASE_PROPS, fps };
  }

  /** The source changed: fly from wherever the mark is now to the new target. */
  retarget({ spin = 0, duration = 0.95 } = {}) {
    this.fly?.tween.kill();
    this.fly = null;
    if (!this.cur || this.reduced || duration <= 0) {
      this.onProps(this.props());
      this.apply();
      return;
    }
    const fly = { from: { ...this.cur }, e: 0, spin, tween: null };
    this.fly = fly;
    this.onProps(this.props());
    fly.tween = gsap.to(fly, {
      e: 1,
      duration,
      ease: "power3.inOut",
      onUpdate: () => this.apply(),
      onComplete: () => {
        if (this.fly !== fly) return;
        this.fly = null;
        this.onProps(this.props());
        this.apply();
      },
    });
  }

  apply() {
    const d = this.desired();
    let p = d;
    if (this.fly) {
      const { from, e, spin } = this.fly;
      const arc = Math.sin(Math.PI * e);
      p = {
        x: lerp(from.x, d.x, e),
        y: lerp(from.y, d.y, e) - arc * Math.min(80, Math.abs(d.y - from.y) * 0.15),
        h: Math.exp(lerp(Math.log(from.h), Math.log(d.h), e)),
        yaw: lerp(from.yaw, d.yaw, e) + spin * Math.PI * 2 * e,
        pitch: lerp(from.pitch, d.pitch, e) + (spin ? arc * 0.28 : 0),
        prog: lerp(from.prog, d.prog, e),
        op: lerp(from.op, d.op, e),
        z: Math.max(from.z, d.z, Z.dock),
      };
    }
    let z = p.z;
    if (this.transit) z = Math.max(z, Z.transit);
    this.render(p, z);
  }

  render(p, z) {
    this.cur = p;
    const box = this.box;
    if (!box) return;
    const size = Math.max(8, Math.round(MARK_K * p.h));
    if (size !== this.lastSize) {
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      this.lastSize = size;
    }
    box.style.transform = `translate3d(${(p.x - size / 2).toFixed(1)}px, ${(p.y - size / 2).toFixed(1)}px, 0)`;
    const op = clamp01(p.op);
    box.style.opacity = op.toFixed(3);
    box.style.visibility = op < 0.01 ? "hidden" : "visible";
    box.style.zIndex = String(z);
    const m = this.merc?.current;
    if (m) {
      m.setProgress(p.prog, true);
      m.setRotation(p.yaw, p.pitch, true);
    }
  }

  // ---- owner API (home page)
  claim(id, props = {}, pose = null) {
    this.owner = { id, props, pose };
    this.retarget({ spin: 1, duration: 1.05 });
  }
  release(id) {
    if (!this.owner || (id && this.owner.id !== id)) return;
    this.owner = null;
    if (!this.menu) this.retarget({ spin: 1, duration: 0.9 });
  }
  push(id, pose) {
    if (!this.owner || this.owner.id !== id) return;
    this.owner.pose = pose;
    if (!this.menu && !this.fly) this.apply();
  }
  setOwnerProps(id, props) {
    if (!this.owner || this.owner.id !== id) return;
    this.owner.props = { ...this.owner.props, ...props };
    this.onProps(this.props());
  }

  // ---- menu API
  openMenu(el, state) {
    this.menu = { el, state: { yaw: 0.1, pitch: -0.1, prog: 0, lift: 0, ...state }, tween: null };
    this.retarget({ spin: 0.5, duration: 0.9 });
  }
  setMenu(state) {
    const m = this.menu;
    if (!m) return;
    m.tween?.kill();
    if (this.reduced) {
      Object.assign(m.state, state);
      if (!this.fly) this.apply();
      return;
    }
    m.tween = gsap.to(m.state, { ...state, duration: 0.7, ease: "power3.out", onUpdate: () => !this.fly && this.apply() });
  }
  closeMenu() {
    if (!this.menu) return;
    this.menu.tween?.kill();
    this.menu = null;
    this.retarget({ spin: -0.5, duration: 0.7 });
  }

  ripple(a = 0.012) {
    this.merc?.current?.ripple(a);
  }
  drop() {
    this.merc?.current?.drop();
  }
}

/**
 * Mount once above the routes. `revealed` flips when the preloader starts its exit:
 * the mark's bead intro is held until then. `transitioning` keeps the mark above the
 * swipe panel while a route change is covering the page.
 */
export function MarkProvider({ children, revealed, transitioning, homeActive }) {
  const ctl = useMemo(() => new MarkController(), []);
  const boxRef = useRef(null);
  const mercRef = useRef(null);
  const [props, setProps] = useState(() => ctl.props());
  const introPlayed = useRef(false);
  const onReady = useMemo(() => () => ctl.apply(), [ctl]);

  useLayoutEffect(() => {
    ctl.box = boxRef.current;
    ctl.merc = mercRef;
    ctl.onProps = setProps;
    setProps(ctl.props());
    ctl.apply();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ctl.remeasure());
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ctl.fly?.tween.kill();
      ctl.box = null;
    };
  }, [ctl]);

  useEffect(() => {
    ctl.transit = !!transitioning;
    // the navbar (and its slot) remounts with the new page
    ctl.dock = null;
    ctl.apply();
  }, [ctl, transitioning]);

  // Leaving home: hand the mark back to the dock right away (it flies over the swipe panel).
  useEffect(() => {
    if (!homeActive) ctl.release("home");
  }, [ctl, homeActive]);

  useEffect(() => {
    if (!revealed || introPlayed.current) return;
    introPlayed.current = true;
    if (!ctl.reduced) mercRef.current?.playIntro(0.35);
  }, [ctl, revealed]);

  return (
    <MarkContext.Provider value={ctl}>
      {children}
      <div ref={boxRef} className={s.box} aria-hidden="true">
        <MercuryLogo
          ref={mercRef}
          env={GLASS_ENV}
          fit={FIT}
          intro={false}
          smoothing={0}
          shadow={0}
          contours={0.9}
          rotation={{ yaw: DOCK_YAW, pitch: DOCK_PITCH }}
          label="DVM"
          onReady={onReady}
          {...props}
        />
      </div>
    </MarkContext.Provider>
  );
}

/** Navbar slot outline: where the mark docks. */
export const LOGO_VIEWBOX = "-470.31 -227.2 250.53 326.78";
export const LOGO_D = [
  "M-470.31-189.24V-37.4l106.28,75.91l99.96-75.91v-151.83l-95.53,72.75l-55.04-37.33l-0.63,36.06l55.04,35.43l69.59-51.25v77.19l-72.75,56.3l-70.86-49.97l-1.26-120.84L-470.31-189.24z",
  "M-467.26-11.82l100.58,70.55l114.59-86.03v-177l32.31-22.9v212.9L-370.95,99.58l-99.36-72.4V-11.2L-467.26-11.82z",
];
