// The V8 brand mark: ONE live hologram (chrome/HoloMarkCanvas.tsx, one WebGL context) for the
// whole variant. It exists in exactly three situations:
//   - the home hero (hanging in the projector's beam),
//   - the hero → dock flight (home/Hero.jsx flies it into the navbar's mark slot and crossfades
//     it into the static print there),
//   - the menu's well (it materialises in place and turns for the hovered item).
// Everywhere else the navbar shows the static SVG mark (chrome/Navbar.jsx Lockup) and the live
// box is hidden (and renders no frames). Nothing ever flies on a route change.
// The box is a square of MARK_K × the mark height centred on the mark, so moving / shrinking
// it is just translate + size; the canvas resolution is quantised and CSS-scaled
// (chrome/markControl.js render()). Controller, context and hook: chrome/markControl.js; logo
// data and layers: chrome/markData.js.
// Without WebGL (or once its context is lost) the same box shows a static print of the mark, so
// the hero, the flight and the menu keep their logo.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import HoloMarkCanvas from "./HoloMarkCanvas";
import GLBoundary from "./GLBoundary";
import { makeMarkRuntime } from "./holo/runtime";
import { MarkContext, MarkController } from "./markControl";
import { LOGO_D, LOGO_VIEWBOX } from "./markData";
import { useReducedMotion } from "../lib/hooks";
import s from "./mark.module.css";

/** The box's static fallback: the print at the hologram's size (1 / MARK_K of the box). */
function FallbackMark() {
  return (
    <svg className={s.fallback} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs>
        <linearGradient id="v8-mark-fallback" gradientUnits="userSpaceOnUse" x1="0" y1="-227.2" x2="0" y2="99.58">
          <stop offset="0" stopColor="#8df0ff" />
          <stop offset="0.55" stopColor="#45e6ff" />
          <stop offset="1" stopColor="#2cb8d6" />
        </linearGradient>
      </defs>
      {LOGO_D.map((d) => (
        <path key={d.slice(0, 12)} d={d} fill="url(#v8-mark-fallback)" />
      ))}
    </svg>
  );
}

/** Mount once above the routes. Leaving home hides the live mark (the bar shows its print). */
export function MarkProvider({ children, homeActive }) {
  const reduced = useReducedMotion();
  // the runtime exists from the first render: pages read `mark.rt` while rendering their stage
  const ctl = useMemo(() => {
    const c = new MarkController();
    c.rt = makeMarkRuntime(c.reduced, window.innerWidth < 760);
    return c;
  }, []);
  const rt = ctl.rt;
  const boxRef = useRef(null);
  const wrapRef = useRef(null);

  useLayoutEffect(() => {
    ctl.box = boxRef.current;
    ctl.wrap = wrapRef.current;
    ctl.syncProps();
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
      ctl.dispose();
    };
  }, [ctl, rt]);

  // the OS setting can change while the variant is open
  useEffect(() => {
    ctl.setReduced(reduced);
  }, [ctl, reduced]);

  // Leaving home: the live mark goes dark at once (the bar's static print is already there).
  useEffect(() => {
    if (!homeActive) ctl.release("home");
  }, [ctl, homeActive]);

  return (
    <MarkContext.Provider value={ctl}>
      {children}
      <div ref={boxRef} className={s.box} aria-hidden="true">
        <div ref={wrapRef} className={s.wrap}>
          <GLBoundary fallback={<FallbackMark />} onFail={() => ctl.setFailed(true)} onRecover={() => ctl.setFailed(false)}>
            {(onLost, attempt) => <HoloMarkCanvas key={attempt} rt={rt} onLost={onLost} />}
          </GLBoundary>
        </div>
      </div>
    </MarkContext.Provider>
  );
}
