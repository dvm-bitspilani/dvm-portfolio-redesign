// The opening leader: a film countdown (5, 4, 3, 2) with the sweeping hand, a one-frame
// flash on "2", then the countdown circle shrinks onto the lamp and the screen opens out
// of it (an iris from the mark's position), while three beads of mercury fall into the
// mark. Click, Esc, Enter or Space skips straight to the iris. Skipped entirely with
// prefers-reduced-motion (the shell never mounts it).
import { useCallback, useEffect, useRef, useState } from "react";
import s from "./leader.module.css";

const COUNT = [5, 4, 3, 2];
const BEAT = 620; // ms per number
const RESOLVE = 900;

export default function Leader({ getTarget, onResolve, onDone }) {
  const [n, setN] = useState(COUNT[0]);
  const [flash, setFlash] = useState(false);
  const root = useRef(null);
  const rings = useRef(null);
  const resolving = useRef(false);
  const timers = useRef([]);
  const raf = useRef(0);
  const skipBtn = useRef(null);

  const resolve = useCallback(() => {
    if (resolving.current) return;
    resolving.current = true;
    timers.current.forEach(clearTimeout);
    setFlash(false);
    onResolve?.();
    const el = root.current;
    const rg = rings.current;
    if (!el || !rg) {
      onDone?.();
      return;
    }
    el.setAttribute("data-resolving", "");
    const W = window.innerWidth;
    const H = window.innerHeight;
    const start = performance.now();
    const ringR = Math.min(W, H) * 0.33;
    const frame = (now) => {
      const t = Math.min(1, (now - start) / RESOLVE);
      // the lamp pose can still be settling (fonts, layout): read it every frame
      const target = getTarget?.() || { x: W / 2, y: H / 2, h: 120 };
      const a = 1 - Math.pow(1 - Math.min(1, t / 0.6), 3); // rings onto the lamp
      const k = (target.h * 0.95) / ringR;
      const sc = 1 + (k - 1) * a;
      const x = (target.x - W / 2) * a;
      const y = (target.y - H / 2) * a;
      rg.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
      rg.style.opacity = String(1 - Math.max(0, (t - 0.55) / 0.45));
      const h = Math.max(0, (t - 0.35) / 0.65);
      const hole = Math.pow(h, 2.2) * Math.hypot(W, H) * 1.05;
      el.style.setProperty("--hx", `${target.x.toFixed(1)}px`);
      el.style.setProperty("--hy", `${target.y.toFixed(1)}px`);
      el.style.setProperty("--hole", `${hole.toFixed(1)}px`);
      if (t < 1) raf.current = requestAnimationFrame(frame);
      else onDone?.();
    };
    raf.current = requestAnimationFrame(frame);
  }, [getTarget, onResolve, onDone]);

  useEffect(() => {
    const ts = timers.current;
    COUNT.forEach((v, i) => ts.push(setTimeout(() => setN(v), i * BEAT)));
    ts.push(setTimeout(() => setFlash(true), COUNT.length * BEAT - 90));
    ts.push(setTimeout(resolve, COUNT.length * BEAT + 40));
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        resolve();
      }
    };
    window.addEventListener("keydown", onKey);
    skipBtn.current?.focus({ preventScroll: true });
    return () => {
      ts.forEach(clearTimeout);
      cancelAnimationFrame(raf.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [resolve]);

  return (
    <div ref={root} className={s.leader} onPointerDown={resolve} role="dialog" aria-label="Opening countdown">
      <div className={s.film} aria-hidden="true">
        <span className={s.edge}>DVM 35 LEADER</span>
        <div ref={rings} className={s.rings}>
          <span className={s.ringOuter} />
          <span className={s.ringInner} />
          <span key={n} className={s.sweep} />
          <span className={s.num}>{n}</span>
        </div>
        <span className={s.crossH} />
        <span className={s.crossV} />
      </div>
      {flash && <div className={s.flash} aria-hidden="true" />}
      <button ref={skipBtn} type="button" className={s.skip} onClick={resolve}>
        Skip countdown
      </button>
    </div>
  );
}
