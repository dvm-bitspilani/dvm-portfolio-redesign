// Desktop wallpaper: V2's horizon in OS form. The teal noise texture revealed around the
// cursor and the mark, thin vertical grid, a horizon line with a receding floor grid, and
// the DVM mark standing on it as x-ray contours (drawn once into a 2D canvas, mirrored in
// the floor). Modes: "horizon" (default), "xray", "quiet".
import { useEffect, useRef } from "react";
import bg3 from "../../../assests/bg_3.png";
import { LOGO_PATHS } from "../../../immersive/shared/logo";
import { reducedNow } from "../lib/hooks";
import s from "./wallpaper.module.css";

// tight bbox of LOGO_PATHS
const BB = { x: -470.31, y: -227.2, w: 250.53, h: 326.78 };
const paths = typeof Path2D !== "undefined" ? LOGO_PATHS.map((d) => new Path2D(d)) : [];

function drawMark(cv, mode, mobile) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth;
  const H = cv.clientHeight;
  if (!W || !H) return;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const horizon = H * (mobile ? 0.8 : 0.72);
  const mh = Math.min(H * (mobile ? 0.2 : 0.5), W * (mobile ? 0.46 : 0.34));
  const k = mh / BB.h;
  const cx = W * (mobile ? 0.5 : 0.6);
  const ox = cx - (BB.w * k) / 2;
  const oy = horizon - BB.h * k - mh * 0.02;

  const tmp = document.createElement("canvas");
  tmp.width = cv.width;
  tmp.height = cv.height;
  const t = tmp.getContext("2d");

  const place = (c) => {
    c.setTransform(dpr * k, 0, 0, dpr * k, dpr * (ox - BB.x * k), dpr * (oy - BB.y * k));
  };
  const strokeAll = (c, w) => {
    c.lineWidth = w;
    for (const p of paths) c.stroke(p);
  };

  // distance contours: ring i = stroke(2r+line) minus stroke(2r-line)
  const rings = mode === "quiet" ? 5 : 11;
  const step = mode === "quiet" ? 18 : 13; // css px
  for (let i = 1; i <= rings; i++) {
    const r = (i * step) / k;
    const line = (mode === "xray" ? 1.3 : 1) / k;
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.clearRect(0, 0, tmp.width, tmp.height);
    place(t);
    t.lineJoin = "round";
    t.strokeStyle = "#fff";
    t.globalCompositeOperation = "source-over";
    strokeAll(t, 2 * r + line);
    t.globalCompositeOperation = "destination-out";
    strokeAll(t, 2 * r - line);
    for (const p of paths) t.fill(p);
    const fade = 1 - (i - 1) / rings;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = (mode === "xray" ? 0.5 : mode === "quiet" ? 0.14 : 0.3) * fade * fade;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  }
  // tint the rings teal
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#45e6ff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.restore();

  // the mark: dark glass body, cool gradient, bright edge
  place(ctx);
  const grad = ctx.createLinearGradient(BB.x, BB.y, BB.x + BB.w, BB.y + BB.h);
  grad.addColorStop(0, mode === "quiet" ? "rgba(40,80,92,.35)" : "rgba(120,215,235,.32)");
  grad.addColorStop(0.5, "rgba(14,40,50,.55)");
  grad.addColorStop(1, "rgba(4,12,16,.75)");
  ctx.fillStyle = grad;
  for (const p of paths) ctx.fill(p);
  ctx.strokeStyle = mode === "quiet" ? "rgba(95,212,230,.35)" : "rgba(160,240,255,.85)";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.2 / k;
  for (const p of paths) ctx.stroke(p);

  // reflection in the floor: mirror the drawn band above the horizon, fading down
  const refl = document.createElement("canvas");
  refl.width = cv.width;
  refl.height = cv.height;
  const rc = refl.getContext("2d");
  rc.translate(0, 2 * horizon * dpr);
  rc.scale(1, -1);
  rc.drawImage(cv, 0, 0);
  rc.setTransform(1, 0, 0, 1, 0, 0);
  rc.globalCompositeOperation = "destination-in";
  const fade = rc.createLinearGradient(0, horizon * dpr, 0, (horizon + mh * 0.75) * dpr);
  fade.addColorStop(0, "rgba(0,0,0,.42)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  rc.fillStyle = fade;
  rc.fillRect(0, horizon * dpr, refl.width, refl.height);
  rc.clearRect(0, 0, refl.width, horizon * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(refl, 0, 0);

  cv.parentElement.style.setProperty("--horizon", `${horizon}px`);
  cv.parentElement.style.setProperty("--mark-x", `${cx}px`);
  cv.parentElement.style.setProperty("--mark-y", `${oy + mh / 2}px`);
}

export default function Wallpaper({ mode = "horizon", mobile = false }) {
  const root = useRef(null);
  const cv = useRef(null);

  useEffect(() => {
    const el = cv.current;
    let raf = 0;
    const draw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => drawMark(el, mode, mobile));
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode, mobile]);

  // texture follows the cursor (eased), like the redesign's hero mask
  useEffect(() => {
    if (mobile || reducedNow()) return;
    const el = root.current;
    let tx = innerWidth * 0.3;
    let ty = innerHeight * 0.4;
    let x = tx;
    let y = ty;
    let raf = 0;
    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty("--mx", `${x.toFixed(1)}px`);
      el.style.setProperty("--my", `${y.toFixed(1)}px`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", onMove, { passive: true });
    loop();
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [mobile]);

  return (
    <div ref={root} className={s.wall} data-mode={mode} data-mobile={mobile || undefined} aria-hidden="true">
      <div className={s.texture} style={{ backgroundImage: `url(${bg3})` }} />
      <div className={s.grid} />
      <div className={s.floor}>
        <div className={s.floorGrid} />
      </div>
      <div className={s.horizonLine} />
      <canvas ref={cv} className={s.canvas} />
      <div className={s.vignette} />
    </div>
  );
}
