// The projector's light over the film strip (Selected work on the home page, Five teams on
// /about), adapted from V5's chrome/Projector.jsx. The lamp is the hologram docked in the navbar (top left); its beam crosses the room to the frame in
// the gate: a spot that tracks the nearest frame on a spring (so it sweeps across each frame
// as the strip moves), with dust motes drifting through the cone. The spot IS the room's pool
// of light: this claims chrome/Light.jsx while the strip holds the viewport and pushes the
// spring position into it. Everything is written from one rAF loop that only runs while the
// strip is near the viewport; React never renders per frame.
//
// The hand-off to Legacy (research/v8-cohesion.md §5.2): when the pin lets go, the beam does not
// die with the strip. As Legacy rides up the viewport (q: 0 with its top at the viewport's
// bottom, 1 with it at the top) the spot swings down off the last frame onto the alumni dots'
// formed mark, the pool goes with it, and the cone fades over the last 40 % of Legacy's entry, so
// it is gone just as the dots start their glide onto the paper (LegacyStory). The pool is
// released at q = 1 into Legacy's declared spot, which is the mark's centre (no jump).
// The cone and the motes are one viewport-fixed layer rendered beside the section (not inside
// it: the pinned section clips), so the beam can reach past the section's bottom edge. While
// the strip is still arriving, the layer is masked above the section's top edge, as it was
// when it lived inside the section.
import { useEffect, useRef } from "react";
import { useLight } from "../chrome/lightControl";
import { clamp01, lerp, smooth } from "../lib/math";
import { LEGACY_PLACE } from "./swarmChain";
import s from "./strip.module.css";

const LIGHT = "strip";
/** Vertical centre of the dots' formed mark, as a fraction of the Legacy section's height. */
const MARK_CY = (LEGACY_PLACE.y0 + LEGACY_PLACE.y1) / 2;
const MARK_CX = (LEGACY_PLACE.x0 + LEGACY_PLACE.x1) / 2;
/** Over q: the spot sweeps from the last frame to the mark, and the cone fades. */
const SWEEP = [0, 0.5];
const CONE_OUT = [0.6, 1];
/** While the mark's centre is still below the fold, the spot rests on its visible top instead
 *  (fraction of the viewport's height). */
const MARK_MAX_Y = 0.76;

export default function Spotlight({ sectionRef, trackRef, enabled }) {
  const light = useLight();
  const layer = useRef(null);
  const cone = useRef(null);
  const motes = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!enabled || !section) return;
    const S = { sx: 0, sy: 0, vx: 0, vy: 0, init: false, motes: null, raf: 0, last: 0, near: false, time: 0, top: -1 };
    const io = new IntersectionObserver(
      ([e]) => {
        S.near = e.isIntersecting;
        if (!S.near) {
          light?.release(LIGHT);
          if (cone.current) cone.current.style.opacity = "0";
          const cv = motes.current;
          cv?.getContext("2d")?.clearRect(0, 0, cv.width, cv.height);
        }
      },
      { rootMargin: "25% 0px" },
    );
    io.observe(section);

    const tick = (now) => {
      S.raf = requestAnimationFrame(tick);
      if (!S.near || document.hidden) return;
      const dt = Math.min(0.064, Math.max(0.001, (now - (S.last || now)) / 1000));
      S.last = now;
      S.time += dt;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const sr = section.getBoundingClientRect();
      // how much the strip owns the viewport: full while pinned, fading as it arrives / leaves
      const on = 1 - clamp01(Math.abs(sr.top) / (H * 0.6));
      // the film's rails develop with it (teams.module.css): eased, so they never pop in as a band
      section.style.setProperty("--strip-on", (on * on * (3 - 2 * on)).toFixed(3));

      // ---- Legacy riding in under the released strip
      const legacy = document.getElementById("legacy");
      const L = legacy?.getBoundingClientRect();
      const leaving = sr.top < 0 && !!L;
      const q = leaving ? clamp01(1 - L.top / H) : 0;
      // how much of the beam survives the hand-off (0 while the strip arrives)
      const hand = leaving ? 1 - smooth(CONE_OUT[0], CONE_OUT[1], q) : 0;
      const lit = Math.max(on, hand);

      // ---- the lamp: the docked hologram (viewport px)
      const slot = document.querySelector("[data-v8-mark-slot]");
      const lr = slot?.getBoundingClientRect();
      const lx = lr ? lr.left + lr.width / 2 : 48;
      const ly = lr ? lr.top + lr.height / 2 : 60;

      // ---- the target: the frame nearest the gate's centre…
      let tx = W / 2;
      let ty = sr.top + sr.height * 0.5;
      const track = trackRef.current;
      if (track) {
        let best = null;
        let bestEl = null;
        let bd = Infinity;
        for (const f of track.querySelectorAll("[data-frame]")) {
          const r = f.getBoundingClientRect();
          const c = r.left + r.width / 2;
          const d = Math.abs(c - W / 2);
          if (d < bd) {
            bd = d;
            best = r;
            bestEl = f;
          }
        }
        if (best) {
          const [fx, fy] = (bestEl?.dataset.spot || "0.5,0.5").split(",").map(Number);
          tx = Math.max(W * 0.12, Math.min(W * 0.88, best.left + best.width * fx));
          ty = sr.top + sr.height * fy;
        }
      }
      // …then, as Legacy rides in, the dots' formed mark
      if (q > 0 && L) {
        const k = smooth(SWEEP[0], SWEEP[1], q);
        tx = lerp(tx, L.left + L.width * MARK_CX, k);
        ty = lerp(ty, Math.min(L.top + L.height * MARK_CY, H * MARK_MAX_Y), k);
      }
      if (!S.init) {
        S.sx = tx;
        S.sy = ty;
        S.init = true;
      } else {
        const k = 26;
        const c = 2 * Math.sqrt(k) * 0.62;
        S.vx += (k * (tx - S.sx) - c * S.vx) * dt;
        S.vy += (k * (ty - S.sy) - c * S.vy) * dt;
        S.sx += S.vx * dt;
        S.sy += S.vy * dt;
      }
      const flicker = 0.93 + 0.04 * Math.sin(S.time * 23.1) + 0.03 * Math.sin(S.time * 57.7 + 1.3);
      const radius = Math.min(H * 0.62, W * 0.42);
      // the spot is the room's pool: own it while the strip is within 60% of the viewport, and
      // through the hand-off until Legacy tops the viewport (its declared spot is the mark)
      if (light) {
        const spot = { x: S.sx, y: S.sy, r: radius, f: flicker * lerp(0.35, 1, Math.max(on, leaving ? 1 - q : 0)) };
        if ((on > 0 || leaving) && q < 1) {
          if (light.owns(LIGHT)) light.push(LIGHT, spot);
          else light.claim(LIGHT, spot);
        } else light.release(LIGHT);
      }

      // ---- the layer is masked above the section's top while the strip arrives
      const top = Math.max(0, sr.top);
      if (Math.abs(top - S.top) > 0.5 && layer.current) {
        S.top = top;
        layer.current.style.setProperty("--beam-top", `${top.toFixed(1)}px`);
      }

      // ---- the cone from the lamp to the spot
      const dx = S.sx - lx;
      const dy = S.sy - ly;
      const dist = Math.hypot(dx, dy);
      const ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const hw = (Math.atan((radius * 0.6) / Math.max(1, dist)) * 180) / Math.PI;
      const co = clamp01((dist - 150) / 320) * lit * flicker;
      const cn = cone.current;
      if (cn) {
        cn.style.setProperty("--lx", `${lx.toFixed(1)}px`);
        cn.style.setProperty("--ly", `${ly.toFixed(1)}px`);
        cn.style.setProperty("--ca", `${ang.toFixed(2)}deg`);
        cn.style.setProperty("--cw", `${(hw / 2).toFixed(2)}deg`);
        cn.style.setProperty("--cd", `${dist.toFixed(0)}px`);
        cn.style.opacity = co.toFixed(3);
      }

      // ---- dust in the beam
      const cv = motes.current;
      if (cv) {
        const ctx = cv.getContext("2d");
        const cw = Math.round(W);
        const ch = Math.round(H);
        if (cv.width !== cw || cv.height !== ch) {
          cv.width = cw;
          cv.height = ch;
        }
        ctx.clearRect(0, 0, cw, ch);
        if (co > 0.02 && dist > 1) {
          if (!S.motes) S.motes = Array.from({ length: 80 }, (_, i) => ({ x: Math.random() * cw, y: Math.random() * ch, r: 0.5 + Math.random() * 1.3, ph: i * 1.7 }));
          const nx = dx / dist;
          const ny = dy / dist;
          const cosHw = Math.cos(((hw * 1.15) * Math.PI) / 180);
          ctx.fillStyle = "#d8f6ff";
          for (const mo of S.motes) {
            mo.x += Math.sin(S.time * 0.35 + mo.ph) * 7 * dt - S.vx * 0.004 * dt;
            mo.y += (Math.cos(S.time * 0.27 + mo.ph * 1.3) * 5 + 2) * dt;
            if (mo.x < -4) mo.x += cw + 8;
            else if (mo.x > cw + 4) mo.x -= cw + 8;
            if (mo.y > ch + 4) mo.y -= ch + 8;
            else if (mo.y < -4) mo.y += ch + 8;
            // (above the section's top while it arrives: masked, like the cone)
            if (mo.y < top) continue;
            const vx = mo.x - lx;
            const vy = mo.y - ly;
            const d = Math.hypot(vx, vy);
            if (d < 60 || d > dist * 1.25) continue;
            const cos = (vx * nx + vy * ny) / d;
            if (cos < cosHw) continue;
            const edge = (cos - cosHw) / (1 - cosHw);
            const fade = Math.min(1, (d - 60) / 140) * Math.min(1, (dist * 1.25 - d) / (dist * 0.3));
            const a = co * edge * fade * (0.55 + 0.45 * Math.sin(S.time * 2 + mo.ph));
            if (a < 0.02) continue;
            ctx.globalAlpha = a;
            ctx.fillRect(mo.x, mo.y, mo.r, mo.r);
          }
          ctx.globalAlpha = 1;
        }
      }
    };
    S.raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(S.raf);
      io.disconnect();
      section.style.removeProperty("--strip-on");
      light?.release(LIGHT);
    };
  }, [enabled, sectionRef, trackRef, light]);

  if (!enabled) return null;
  return (
    <div ref={layer} className={s.beamLayer} aria-hidden="true">
      <div ref={cone} className={s.cone} />
      <canvas ref={motes} className={s.motes} />
    </div>
  );
}
