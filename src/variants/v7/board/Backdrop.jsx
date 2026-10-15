// V2's ground under the board: black, thin vertical grid, and the teal noise texture revealed
// through a soft radial mask that drifts toward the pointer (static with reduced motion).
import { useEffect, useRef } from "react";
import bg3 from "../../../assests/bg_3.png";
import s from "./v7.module.css";

export default function Backdrop() {
  const tex = useRef(null);
  useEffect(() => {
    const el = tex.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cur = { x: 0.22, y: 0.3 };
    const tgt = { ...cur };
    let raf = 0;
    const paint = () => {
      el.style.setProperty("--mx", `${(cur.x * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(cur.y * 100).toFixed(2)}%`);
    };
    paint();
    if (reduced) return;
    const step = () => {
      cur.x += (tgt.x - cur.x) * 0.045;
      cur.y += (tgt.y - cur.y) * 0.045;
      paint();
      raf = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) > 0.0008 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e) => {
      tgt.x = e.clientX / window.innerWidth;
      tgt.y = e.clientY / window.innerHeight;
      if (!raf) raf = requestAnimationFrame(step);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return (
    <div className={s.backdrop} aria-hidden="true">
      <div ref={tex} className={s.texture} style={{ backgroundImage: `url(${bg3})` }} />
      <div className={s.lines} />
    </div>
  );
}
