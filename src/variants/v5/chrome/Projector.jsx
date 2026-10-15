// The projector. One live MercuryLogo (one WebGL context for the whole variant) is the
// lamp: big in the Prologue frame, then it rides out of the frame and docks in the HUD
// booth (top left) as you roll on. From there its beam crosses the room to the screen:
// a light spot that tracks the frame in the gate on a spring (so it sweeps across each
// frame as the strip moves), revealing the teal screen texture behind the film, with
// dust motes drifting through the cone. Everything is written to the DOM from the reel
// bus ticker; React only renders when the lamp's material props change.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MercuryLogo, MERCURY_ENVS } from "../../../immersive/kit/mercury";
import bg3 from "../../../assests/bg_3.png";
import s from "./projector.module.css";

const MARK_K = 2.2;
const FIT = { mode: "height", padding: (1 - 1 / MARK_K) / 2 };
const DOCK_YAW = 0.06;
const DOCK_PITCH = -0.12;
const HERO_YAW = 0.1;
const HERO_PITCH = -0.13;
const ENV = { ...MERCURY_ENVS.teal };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function readDock() {
  const el = document.querySelector("[data-v5-lamp-slot]");
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.height > 4) return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
  }
  return { x: 46, y: 64, h: 38 };
}

function mixPose(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    h: Math.exp(lerp(Math.log(a.h), Math.log(b.h), t)),
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    op: lerp(a.op, b.op, t),
  };
}

/**
 * phase: "leader" (lamp dark, countdown running) | "live".
 * The ref exposes intro() (beads fall into the mark) and pose() (current lamp centre).
 */
export const Projector = forwardRef(function Projector({ bus, phase, routeKey }, ref) {
  const box = useRef(null);
  const merc = useRef(null);
  const screen = useRef(null);
  const cone = useRef(null);
  const glow = useRef(null);
  const motes = useRef(null);
  const [mode, setMode] = useState("dock"); // hero | dock (drives renderer props)
  const st = useRef({
    cur: null,
    from: null,
    blend: 1,
    source: "",
    dock: null,
    lastSize: 0,
    sx: 0,
    sy: 0,
    vx: 0,
    vy: 0,
    init: false,
    phase,
    mode: "dock",
    motes: null,
  });
  st.current.phase = phase;

  useImperativeHandle(ref, () => ({
    intro: (delay = 0) => !bus.reduced && merc.current?.playIntro(delay),
    pose: () => st.current.cur,
    ripple: (a) => merc.current?.ripple(a),
  }));

  // dock slot moves with layout (and the header remounts per route)
  useLayoutEffect(() => {
    st.current.dock = null;
    const id = requestAnimationFrame(() => (st.current.dock = null));
    const onResize = () => (st.current.dock = null);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [routeKey]);

  const tick = useCallback(
    (b, dt) => {
      const S = st.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (!S.dock) S.dock = readDock();
      const dock = { ...S.dock, yaw: DOCK_YAW, pitch: DOCK_PITCH, op: 1 };
      const travel = b.mode === "travel";

      // ---- desired lamp pose
      let desired = dock;
      let source = "dock";
      let heroAmount = 0;
      if (b.attached && b.hero && b.hero.h > 0) {
        const hx = travel ? b.hero.x - b.pos : b.hero.x;
        const hy = travel ? b.hero.y : b.hero.y - b.pos;
        const e = smooth(clamp01(b.pos / (b.size * (travel ? 0.55 : 0.45))));
        const hero = { x: hx, y: hy, h: b.hero.h, yaw: HERO_YAW + Math.sin(b.time * 0.4) * 0.05, pitch: HERO_PITCH, op: 1 };
        desired = mixPose(hero, dock, e);
        desired.yaw += e * Math.PI * 2;
        desired.pitch += Math.sin(e * Math.PI) * 0.25;
        heroAmount = 1 - e;
        source = "hero";
      }
      if (S.phase === "leader") desired = { ...desired, op: 0 };

      if (!S.cur) S.cur = desired;
      if (source !== S.source) {
        if (S.source && !b.reduced) {
          S.from = { ...S.cur };
          S.blend = 0;
        }
        S.source = source;
      }
      let p = desired;
      if (S.blend < 1 && S.from) {
        S.blend = Math.min(1, S.blend + dt / 0.95);
        const e = easeInOut(S.blend);
        p = mixPose(S.from, desired, e);
        p.yaw += Math.PI * 2 * e * (source === "dock" ? 1 : -1) * (1 - S.blend > 0 ? 1 : 0);
        p.y -= Math.sin(Math.PI * e) * Math.min(90, Math.abs(desired.y - S.from.y) * 0.2);
      }
      S.cur = p;

      // ---- lamp box
      const el = box.current;
      if (el) {
        const size = Math.max(8, Math.round(MARK_K * p.h));
        if (size !== S.lastSize) {
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          S.lastSize = size;
        }
        el.style.transform = `translate3d(${(p.x - size / 2).toFixed(1)}px, ${(p.y - size / 2).toFixed(1)}px, 0)`;
        const op = clamp01(p.op);
        el.style.opacity = op.toFixed(3);
        el.style.visibility = op < 0.01 ? "hidden" : "visible";
      }
      const m = merc.current;
      if (m) m.setRotation(p.yaw, p.pitch, true);
      const wantMode = heroAmount > 0.9 ? "hero" : "dock";
      if (wantMode !== S.mode) {
        S.mode = wantMode;
        setMode(wantMode);
      }

      // ---- the light spot on the screen: follows the frame in the gate, on a spring
      let tx = W / 2;
      let ty = H / 2;
      if (b.attached && b.frames.length) {
        const f = b.frames[b.currentIndex()];
        if (travel) {
          const left = f.x - b.pos;
          tx = f.spot ? left + f.w * f.spot[0] : left + f.w / 2;
          ty = f.spot ? H * f.spot[1] : H * 0.5;
          tx = Math.max(W * 0.12, Math.min(W * 0.88, tx));
        } else {
          const top = f.x - b.pos;
          tx = f.spot ? W * f.spot[0] : W * 0.5;
          ty = Math.max(H * 0.2, Math.min(H * 0.8, f.spot ? top + Math.min(f.w, H) * f.spot[1] : top + Math.min(f.w, H) / 2));
        }
      }
      if (heroAmount > 0) {
        tx = lerp(tx, p.x, heroAmount);
        ty = lerp(ty, p.y, heroAmount);
      }
      if (!S.init || b.reduced) {
        S.sx = tx;
        S.sy = ty;
        S.vx = S.vy = 0;
        S.init = true;
      } else {
        const k = 26;
        const c = 2 * Math.sqrt(k) * 0.62;
        S.vx += (k * (tx - S.sx) - c * S.vx) * dt;
        S.vy += (k * (ty - S.sy) - c * S.vy) * dt;
        S.sx += S.vx * dt;
        S.sy += S.vy * dt;
      }
      const flicker = b.reduced ? 1 : 0.93 + 0.04 * Math.sin(b.time * 23.1) + 0.03 * Math.sin(b.time * 57.7 + 1.3);
      const sr = Math.min(H * 0.62, W * 0.5);
      const sc = screen.current;
      if (sc) {
        sc.style.setProperty("--sx", `${S.sx.toFixed(1)}px`);
        sc.style.setProperty("--sy", `${S.sy.toFixed(1)}px`);
        sc.style.setProperty("--sr", `${sr.toFixed(0)}px`);
        sc.style.setProperty("--sf", flicker.toFixed(3));
      }

      // ---- the cone from the lamp to the spot
      const dx = S.sx - p.x;
      const dy = S.sy - p.y;
      const dist = Math.hypot(dx, dy);
      const ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const hw = (Math.atan((sr * 0.62) / Math.max(1, dist)) * 180) / Math.PI;
      const co = travel && S.phase !== "leader" ? clamp01((dist - 150) / 320) * clamp01(p.op) * flicker : 0;
      const cn = cone.current;
      if (cn) {
        cn.style.setProperty("--lx", `${p.x.toFixed(1)}px`);
        cn.style.setProperty("--ly", `${p.y.toFixed(1)}px`);
        cn.style.setProperty("--ca", `${ang.toFixed(2)}deg`);
        cn.style.setProperty("--cw", `${(hw / 2).toFixed(2)}deg`);
        cn.style.setProperty("--cd", `${dist.toFixed(0)}px`);
        cn.style.opacity = co.toFixed(3);
      }
      const gl = glow.current;
      if (gl) {
        gl.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        gl.style.opacity = (clamp01(p.op) * (1 - heroAmount) * flicker * 0.9).toFixed(3);
      }

      // ---- dust in the beam
      const cv = motes.current;
      if (cv && !b.reduced) {
        const ctx = cv.getContext("2d");
        if (cv.width !== W || cv.height !== H) {
          cv.width = W;
          cv.height = H;
        }
        ctx.clearRect(0, 0, W, H);
        if (co > 0.02) {
          if (!S.motes) {
            S.motes = Array.from({ length: 90 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.3, ph: i * 1.7 }));
          }
          const nx = dx / dist;
          const ny = dy / dist;
          const cosHw = Math.cos(((hw * 1.15) * Math.PI) / 180);
          ctx.fillStyle = "#d8f6ff";
          const drift = b.vel * 0.015;
          for (const mo of S.motes) {
            mo.x += (Math.sin(b.time * 0.35 + mo.ph) * 7 - drift) * dt;
            mo.y += (Math.cos(b.time * 0.27 + mo.ph * 1.3) * 5 + 2) * dt;
            if (mo.x < -4) mo.x += W + 8;
            else if (mo.x > W + 4) mo.x -= W + 8;
            if (mo.y > H + 4) mo.y -= H + 8;
            else if (mo.y < -4) mo.y += H + 8;
            const vx = mo.x - p.x;
            const vy = mo.y - p.y;
            const d = Math.hypot(vx, vy);
            if (d < 60 || d > dist * 1.25) continue;
            const cos = (vx * nx + vy * ny) / d;
            if (cos < cosHw) continue;
            const edge = (cos - cosHw) / (1 - cosHw);
            const fade = Math.min(1, (d - 60) / 140) * Math.min(1, (dist * 1.25 - d) / (dist * 0.3));
            const a = co * edge * fade * (0.55 + 0.45 * Math.sin(b.time * 2 + mo.ph));
            if (a < 0.02) continue;
            ctx.globalAlpha = a;
            ctx.fillRect(mo.x, mo.y, mo.r, mo.r);
          }
          ctx.globalAlpha = 1;
        }
      }
    },
    [],
  );

  useEffect(() => bus.subscribe(tick), [bus, tick]);

  const props = useMemo(
    () =>
      mode === "hero"
        ? { interactive: true, fps: 0, sheen: 1, tilt: 1, sway: 0.8 }
        : { interactive: false, fps: 30, sheen: 0.9, tilt: 0.6, sway: 0.6 },
    [mode],
  );

  return (
    <>
      <div ref={screen} className={s.screen} aria-hidden="true">
        <div className={s.grid} />
        <div className={s.texture} style={{ backgroundImage: `url(${bg3})` }} />
        <div className={s.wash} />
      </div>
      <div ref={cone} className={s.cone} aria-hidden="true" />
      <canvas ref={motes} className={s.motes} aria-hidden="true" />
      <div ref={glow} className={s.glow} aria-hidden="true" />
      <div ref={box} className={s.lamp} aria-hidden="true">
        <MercuryLogo
          ref={merc}
          env={ENV}
          fit={FIT}
          intro={false}
          smoothing={0}
          shadow={0}
          contours={0.8}
          material="chrome"
          pointerTarget="window"
          rotation={{ yaw: DOCK_YAW, pitch: DOCK_PITCH }}
          label="DVM"
          {...props}
        />
      </div>
    </>
  );
});
