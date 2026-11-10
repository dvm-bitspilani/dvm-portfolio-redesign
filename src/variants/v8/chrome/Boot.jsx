// The preloader: the projector finding its signal. One choreographed piece, two hand-offs:
//   the mark   the DVM mark strikes in as one teal line exactly where the hologram will hang,
//              then a short fill bloom; a line lands on the table where the lens will glow.
//   the name   "Department / of Visual / Media" resolves in the display face, line by line, like
//              a projector pulling focus, where the hero copy will stand; it comes sharp as the
//              mark's fill blooms (the same light catches the type), and a rule draws under it
//              together with the table line.
// On exit the mark settles to the hologram's size and fades while the hero's particles scatter
// from the same spot, and the name slides up and fades as "We are DVM" rises into its place.
// Shown on every full page load: the shell mounts it once, so in-app navigation never shows it.
// Pure DOM/CSS: no images, no WebGL, nothing to load before the first frame. The mark's geometry
// comes from the hero stage's own camera (home/stageLayout.ts), so it lands on the hologram.
//
// Timeline (ms, CSS from 0; boot.module.css): stroke 0–620, fill bloom 620–760; name lines from
// 100 / 220 / 340, each sharp 420 later (the last at 760, with the bloom); table line and rule
// 700–900. Exit at max(MIN, fonts ready), hard-capped at CAP; then the FADE. Any input skips
// straight to the fade. Ready = the Hubot faces + document.fonts.ready (lib/fonts.js; not window
// load: the three.js chunk may take seconds and the hero boots under the fade anyway).
// Geometry: measured from the hero stage's own box (`[data-v8-stage]`) before the first paint,
// so on phones (a 100svh hero vs the innerHeight overlay) the printed mark lands on the hologram.
// Reduced motion: the final frame at once (mark drawn, name sharp, lines drawn); only the
// overlay fades.
// Contract with index.jsx: onExit() at the start of the fade (the hero starts its boot under
// it), onFinish() when the overlay is gone. Both always fire, also when skipped.
import * as THREE from "three";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STAGE_LAYOUT, stageCamera, stageMark } from "../home/stageLayout";
import { fontsReady } from "../lib/fonts";
import { LOGO_D, LOGO_VIEWBOX } from "./markData";
import s from "./boot/boot.module.css";

/** Timeline end (ms): the table line and the rule are drawn. */
const MIN = 900;
const CAP = 1800;
const FADE = 280;
const FADE_REDUCED = 200;
/** viewBox height of the mark (LOGO_VIEWBOX). */
const VB_H = 326.78;

/** The hero's own breakpoint (home/Hero.jsx useMedia), so both sides pick the same camera. */
const isNarrow = () => window.matchMedia("(max-width: 759px)").matches;

/** The window, as the hero stage will be (desktop: its `min-height: 560px`). */
function viewport() {
  return { W: window.innerWidth, H: isNarrow() ? window.innerHeight : Math.max(window.innerHeight, 560) };
}

/** The hero stage's real box when it is on the page (home), else null. */
function stageBox() {
  const el = document.querySelector("[data-v8-stage]");
  if (!el || el.clientWidth < 1 || el.clientHeight < 1) return null;
  return { W: el.clientWidth, H: el.clientHeight };
}

/** Mark centre + height and the lens line, in px of the stage box, from the hero stage's camera. */
function geometry({ W, H }) {
  const narrow = isNarrow();
  const m = stageMark(W, H, narrow);
  const v = new THREE.Vector3(0, STAGE_LAYOUT.device.lensY, 0).project(stageCamera(narrow, W / Math.max(1, H)));
  const ty = (-v.y * 0.5 + 0.5) * H;
  return { mx: m.x, my: m.y, mh: m.h, ty: Number.isFinite(ty) && ty > m.y ? ty : m.y + (narrow ? 0.34 : 0.42) * H };
}

export default function Boot({ onExit, onFinish }) {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [geo, setGeo] = useState(() => geometry(viewport()));
  const [out, setOut] = useState(false);
  const cb = useRef({ onExit, onFinish });
  cb.current = { onExit, onFinish };
  const done = useRef({ exit: false, finish: false });
  const timers = useRef([]);
  const fade = reduced ? FADE_REDUCED : FADE;

  // the stage is in the DOM by now (same commit, earlier in the tree): measure its real box
  // before the first paint (phones: the hero is 100svh tall, innerHeight follows the browser's bars)
  useLayoutEffect(() => {
    const box = stageBox();
    if (!box) return;
    const next = geometry(box);
    setGeo((prev) => (prev.mx === next.mx && prev.my === next.my && prev.mh === next.mh && prev.ty === next.ty ? prev : next));
  }, []);

  const exit = useRef(() => {});
  exit.current = () => {
    if (done.current.exit) return;
    done.current.exit = true;
    setOut(true);
    cb.current.onExit?.();
    timers.current.push(
      window.setTimeout(() => {
        if (done.current.finish) return;
        done.current.finish = true;
        cb.current.onFinish?.();
      }, fade),
    );
  };

  // ready = fonts; never before the timeline has played (reduced: a short hold), never after CAP
  useEffect(() => {
    const t0 = performance.now();
    const floor = reduced ? 600 : MIN;
    let cancelled = false;
    const go = () => {
      if (cancelled) return;
      const wait = Math.max(0, floor - (performance.now() - t0));
      timers.current.push(window.setTimeout(() => exit.current(), wait));
    };
    fontsReady().then(go);
    timers.current.push(window.setTimeout(() => exit.current(), CAP));

    // any input skips straight to the fade
    const skip = () => exit.current();
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("pointerdown", skip, { passive: true });
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("keydown", onKey);
    const list = timers.current;
    return () => {
      cancelled = true;
      list.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("keydown", onKey);
    };
  }, [reduced]);

  const style = {
    "--mx": `${geo.mx.toFixed(1)}px`,
    "--my": `${geo.my.toFixed(1)}px`,
    "--mh": `${geo.mh.toFixed(1)}px`,
    "--ty": `${geo.ty.toFixed(1)}px`,
  };
  // a 1.5 px line at the drawn size (1.15 × the hologram's height), in viewBox units
  const sw = (1.5 * VB_H) / Math.max(1, geo.mh * 1.15);
  return (
    <div className={`${s.boot} ${reduced ? s.reduced : ""} ${out ? s.out : ""}`} style={style} role="status" aria-label="Loading">
      <svg className={s.strike} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        {LOGO_D.map((d) => (
          <path key={`g${d.slice(0, 12)}`} d={d} className={s.strikeGhost} strokeWidth={sw} />
        ))}
        {LOGO_D.map((d) => (
          <path key={d.slice(0, 12)} d={d} className={s.strikePath} pathLength="1" strokeWidth={sw} />
        ))}
      </svg>
      <span className={s.tableLine} aria-hidden="true" />
      <div className={s.readout} aria-hidden="true">
        <span className={s.readLine}>Department</span>
        <span className={s.readLine}>of Visual</span>
        <span className={s.readLine}>Media</span>
        <span className={s.readRule} />
      </div>
    </div>
  );
}
