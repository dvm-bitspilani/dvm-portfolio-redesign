// Data sparks: short pulses of light that run along the gutters between tiles, like signal
// travelling between modules. Canvas 2D behind the tiles; a handful alive at once; off with
// reduced motion and while the tab is hidden.
import { useEffect, useRef } from "react";
import s from "./v7.module.css";

const MAX = 5;
const SPAWN_MS = 900;

export default function Signals({ gridRef, layoutKey }) {
  const canvas = useRef(null);
  const segs = useRef([]);

  // Gutter segments: the right and bottom edge of every tile, offset into the gap.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let t = 0;
    const measure = () => {
      const g = grid.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 10;
      const out = [];
      grid.querySelectorAll("[data-v7-tile]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const x = r.left - g.left;
        const y = r.top - g.top;
        if (r.right + gap < g.right - 2) out.push({ x0: x + r.width + gap / 2, y0: y, x1: x + r.width + gap / 2, y1: y + r.height });
        if (r.bottom + gap < g.bottom - 2) out.push({ x0: x, y0: y + r.height + gap / 2, x1: x + r.width, y1: y + r.height + gap / 2 });
      });
      segs.current = out;
    };
    // after the layout transition has settled
    t = window.setTimeout(measure, 700);
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(measure, 200);
    });
    ro.observe(grid);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [gridRef, layoutKey]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    const live = [];
    let raf = 0;
    let last = performance.now();
    let spawn = 0;
    let w = 0;
    let h = 0;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    const frame = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      spawn -= dt;
      if (spawn <= 0 && live.length < MAX && segs.current.length) {
        spawn = SPAWN_MS * (0.6 + Math.random() * 0.8);
        const sg = segs.current[(Math.random() * segs.current.length) | 0];
        const rev = Math.random() < 0.5;
        live.push({ sg, rev, t: 0, speed: 0.00045 + Math.random() * 0.00035 });
      }
      ctx.clearRect(0, 0, w, h);
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        p.t += dt * p.speed;
        if (p.t >= 1.25) {
          live.splice(i, 1);
          continue;
        }
        const { x0, y0, x1, y1 } = p.sg;
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const tail = Math.min(0.35, 90 / len);
        const a = Math.max(0, Math.min(1, p.t));
        const b = Math.max(0, Math.min(1, p.t - tail));
        const f = (u) => (p.rev ? 1 - u : u);
        const hx = x0 + (x1 - x0) * f(a);
        const hy = y0 + (y1 - y0) * f(a);
        const tx = x0 + (x1 - x0) * f(b);
        const ty = y0 + (y1 - y0) * f(b);
        const fade = p.t > 1 ? 1 - (p.t - 1) / 0.25 : 1;
        const grad = ctx.createLinearGradient(tx, ty, hx, hy);
        grad.addColorStop(0, "rgba(69,230,255,0)");
        grad.addColorStop(1, `rgba(69,230,255,${0.75 * fade})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        if (p.t <= 1) {
          ctx.fillStyle = `rgba(207,248,255,${0.9 * fade})`;
          ctx.beginPath();
          ctx.arc(hx, hy, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={canvas} className={s.signals} aria-hidden="true" />;
}
