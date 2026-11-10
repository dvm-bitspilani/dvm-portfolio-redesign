// V8 hero: the Holo projector. A pedestal emitter on a reflective lab table casts the DVM mark as a
// scanned hologram (home/HeroStage.tsx). The hologram is the variant's one persistent mark
// (chrome/mark.jsx), borrowed for this page and posed over the beam; one headline, one line.
// The pool of light follows the pointer: the hero owns the room's light (chrome/Light.jsx)
// until the mark docks, and shows the same pool over its opaque stage. The stage dissolves into
// the room over its last rows (hero.module.css), so About follows with no edge between them.
//
// The flight (time-based, triggered by the first scroll, so a fast scroller cannot miss it):
//   hero      the mark hangs in the beam, turning toward the cursor (no hover effect on the mark
//             itself for now; see rt.pointer, chrome/holo/runtime.ts). While it is not flying
//             it tracks the hero (M.y - scrollY) like any element.
//   launch    the first downward wheel / touch movement, or scrollY past THRESHOLD (24 px), plays
//             one 1.7 s power2.inOut flight; scrolling back to within THRESHOLD of the top plays
//             it in reverse. A reversal mid-flight retargets from the current pose; a partial
//             flight takes proportionally less time, never under 0.7 s.
//             Every channel below is eased once more with a sine-out from t = 0 (no delays, no
//             in-out on top of the tween's in-out, which bunched the whole flight into ~0.15 s):
//             the motion spreads over ~0.2–1.1 s, lands softly and has converged before the
//             crossfade (t ≥ 0.9, the last ~0.4 s).
//   → lift    the projector dims as the mark leaves the cone (`signal.lift`)
//   → flight  it rises, flips (a full yaw turn) and shrinks along a short arc
//   → dock    and lands in the navbar's mark slot, crossfading into the bar's static print
//             (`--mark-static`); the hologram then stops rendering.
// Reduced motion: no flight; past the threshold the live mark crossfades (150 ms) into the print.
// The copy still leaves with the scroll (gone at 24 % of the hero).
// Zoom is not a scroll: a trackpad pinch (ctrl+wheel), a touch pinch (two fingers), any time
// the page is zoomed in, and a short settle after every viewport / layout change (resize,
// visual-viewport resize / scroll, a ScrollTrigger refresh) never fly the mark; the scroll
// position is re-baselined instead, and only real scrolling afterwards decides.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import bg3 from "../../../assests/bg_3.png";
import { useMedia, useReducedMotion } from "../lib/hooks";
import { lerp, seg, sineOut as out, sub } from "../lib/math";
import { scheduleRefresh } from "../lib/refresh";
import GLBoundary from "../chrome/GLBoundary";
import StageDebug from "../chrome/holo/StageDebug";
import StageFallback from "../chrome/holo/StageFallback";
import { errorText, stageDebug, stageDebugOn, stageNote } from "../lib/stageDebug";
import { DOCK_PITCH, DOCK_YAW, Z } from "../chrome/markData";
import { useMark } from "../chrome/markControl";
import { setStaticMark, useChrome } from "../chrome/shell";
import { useLight } from "../chrome/lightControl";
import HeroStage from "./HeroStage";
import { stageMark } from "./stageLayout";
import s from "./hero.module.css";

gsap.registerPlugin(ScrollTrigger);

const OWNER = "home";
const LIGHT = "hero";
/** The pool's radius over the stage (matches the room's 34vw; wider on phones). */
const poolRadius = (W) => (W < 760 ? W * 0.7 : W * 0.34);
const HERO_YAW = 0.08;
const HERO_PITCH = -0.1;
const TAU = Math.PI * 2;
/** Scroll (css px) past which the mark docks; back within it, it returns to the beam. */
const THRESHOLD = 24;
const FLIGHT_S = 1.7;
/** The shortest (partial, reversed) flight. */
const FLIGHT_MIN_S = 0.7;
const FLIGHT_EASE = "power2.inOut";
const FADE_S = 0.15;
/** Touch travel (px) that counts as a scroll intent at the top. */
const TOUCH_INTENT = 8;
/** The page counts as zoomed in when the visual viewport's scale is this far from 1. */
const ZOOM_EPSILON = 0.01;
/**
 * Viewport settle policy: after a resize, a visual-viewport change, a ScrollTrigger refresh or a
 * pinch, scroll events for this long only re-pose the mark (no flight decision), because the
 * browser moves the layout scroll on its own then (zoom, scroll anchoring, refresh). When it
 * ends, a plain viewport change (no zoom involved) gets the usual decision from where the
 * scroll ended up; after a zoom / pinch only the baseline moves, so the mark keeps its place.
 */
const VIEWPORT_SETTLE_MS = 250;

function useStageLayout(heroRef, narrow) {
  const compute = useCallback(() => {
    const el = heroRef.current;
    const W = el?.clientWidth || window.innerWidth;
    const H = el?.clientHeight || window.innerHeight;
    return { W, H, mobile: narrow, mark: stageMark(W, H, narrow) };
  }, [heroRef, narrow]);
  // (the hero has `min-height: 560px` on desktop: pose for that height from the first frame)
  const [layout, setLayout] = useState(() => {
    const W = window.innerWidth;
    const H = narrow ? window.innerHeight : Math.max(window.innerHeight, 560);
    return { W, H, mobile: narrow, mark: stageMark(W, H, narrow) };
  });
  useLayoutEffect(() => {
    setLayout(compute());
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = compute();
        setLayout((prev) => (prev.W === next.W && prev.H === next.H && prev.mobile === next.mobile ? prev : next));
      });
    };
    // the hero's own box (its height follows the viewport: hero.module.css)
    const el = heroRef.current;
    const ro = typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    else window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [compute, heroRef]);
  return layout;
}

/** Fresh canvases the stage gets before its CSS projector stays (chrome/GLBoundary.jsx). */
const STAGE_ERROR_RETRIES = 2;
const STAGE_LOSS_RETRIES = 3;

/** The stage renders only while the hero is near the viewport and the tab is visible (it stays
 *  mounted: its canvas just stops drawing, `frameloop="never"`). */
function useStageActive(ref) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = true;
    const sync = () => setActive(inView && !document.hidden);
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        sync();
      },
      { rootMargin: "20% 0px" },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref]);
  return active;
}

export default function Hero() {
  const wrapRef = useRef(null);
  const heroRef = useRef(null);
  const textureRef = useRef(null);
  const copyRef = useRef(null);
  const mark = useMark();
  const light = useLight();
  const { revealed, menuOpen } = useChrome();
  const reduced = useReducedMotion();
  const narrow = useMedia("(max-width: 759px)");
  const fine = useMedia("(pointer: fine)");
  const layout = useStageLayout(heroRef, narrow);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const active = useStageActive(heroRef);
  const [phase, setPhase] = useState("wait");
  const onPhase = useCallback((p) => {
    setPhase(p);
    stageNote({ phase: p });
  }, []);
  // the stage's WebGL failed: the CSS projector shows (while a fresh canvas is tried, and for
  // good only after repeated failures) and the mark settles its own signal meanwhile
  const [stageOk, setStageOk] = useState(true);
  const onStageFail = useCallback((error, info) => {
    setStageOk(false);
    stageNote({ fallback: true, final: !!info?.final, error: errorText(error) });
  }, []);
  const onStageRecover = useCallback(() => {
    setStageOk(true);
    stageNote({ fallback: false, contextLost: false, attempt: stageDebug.attempt + 1 });
  }, []);
  // `?debug=stage`: the readout, and the state it starts from on this visit to the page
  const debug = stageDebugOn();
  useEffect(() => {
    stageNote({ fallback: false, final: false, error: "", contextLost: false, attempt: 0 });
  }, []);
  useEffect(() => {
    stageNote({ revealed, active });
  }, [revealed, active]);
  const stateRef = useRef({ c: 0, lastProps: "" });

  // ---- borrow the brand mark for this page: it is posed in the beam at once (no flight; the
  // stage's scatter → build boot is the entrance)
  useLayoutEffect(() => {
    if (!mark) return;
    const L = layoutRef.current;
    // held dark until the stage boots it (HeroStage does the same once its canvas is up; doing
    // it here too means the mark never shows a stale, fully built frame on arrival)
    if (!mark.rt.reduced) {
      mark.rt.signal.build = 0;
      mark.rt.signal.scatter = 1.2;
    }
    mark.claim(
      OWNER,
      { fps: 60, driven: true },
      { x: L.mark.x, y: L.mark.y - window.scrollY, h: L.mark.h, yaw: HERO_YAW, pitch: HERO_PITCH, op: 1, z: Z.page },
    );
    return () => {
      mark.release(OWNER);
      // inner pages always show the bar's print
      setStaticMark(1);
    };
  }, [mark]);

  // which props the mark needs for the current scroll phase / visibility
  const syncProps = useCallback(() => {
    if (!mark) return;
    const c = stateRef.current.c;
    const key = c >= 1 ? "docked" : c > 0 ? "flight" : !active ? "away" : stageOk ? "stage" : "solo";
    if (key === stateRef.current.lastProps) return;
    stateRef.current.lastProps = key;
    if (key === "stage") mark.setOwnerProps(OWNER, { driven: true, fps: 60 });
    else if (key === "solo") mark.setOwnerProps(OWNER, { driven: false, fps: 60 });
    else if (key === "flight") mark.setOwnerProps(OWNER, { driven: false, fps: 60 });
    else if (key === "docked") mark.setOwnerProps(OWNER, { driven: false, fps: 0 });
    else mark.setOwnerProps(OWNER, { driven: false, fps: 24 });
  }, [mark, active, stageOk]);
  useEffect(syncProps, [syncProps]);
  const syncPropsRef = useRef(syncProps);
  syncPropsRef.current = syncProps;

  // ---- the pool of light drifts toward the pointer. The stage canvas is opaque (except where it
  // fades into the room at the bottom), so the hero shows the pool on its own texture layer and
  // pushes the same spot (in viewport px) to the room's light, which takes over seamlessly as the
  // hero scrolls away.
  const pool = useRef({ x: 0, y: 0 });
  const pushLight = useCallback(() => {
    const hero = heroRef.current;
    if (!hero || !light) return;
    const top = hero.getBoundingClientRect().top;
    light.push(LIGHT, { x: pool.current.x, y: pool.current.y + top, r: poolRadius(window.innerWidth), f: 1 });
  }, [light]);
  const pushLightRef = useRef(pushLight);
  pushLightRef.current = pushLight;

  useEffect(() => {
    const hero = heroRef.current;
    const tex = textureRef.current;
    if (!hero || !tex) return;
    const L = layoutRef.current;
    const pos = { x: L.mark.x, y: L.mark.y * 0.9, tx: L.mark.x, ty: L.mark.y * 0.9 };
    tex.style.setProperty("--tr", `${poolRadius(window.innerWidth).toFixed(0)}px`);
    const paint = () => {
      tex.style.setProperty("--tx", `${pos.x.toFixed(1)}px`);
      tex.style.setProperty("--ty", `${pos.y.toFixed(1)}px`);
      pool.current.x = pos.x;
      pool.current.y = pos.y;
      pushLightRef.current();
    };
    paint();
    if (reduced || !fine) return;
    let raf = 0;
    const loop = () => {
      pos.x += (pos.tx - pos.x) * 0.06;
      pos.y += (pos.ty - pos.y) * 0.06;
      paint();
      if (Math.abs(pos.tx - pos.x) + Math.abs(pos.ty - pos.y) > 0.5) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const go = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      const M = layoutRef.current.mark;
      pos.tx = M.x + (e.clientX - r.left - M.x) * 0.5;
      pos.ty = M.y + (e.clientY - r.top - M.y) * 0.4;
      go();
    };
    const onLeave = () => {
      const M = layoutRef.current.mark;
      pos.tx = M.x;
      pos.ty = M.y * 0.9;
      go();
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, fine, layout]);

  // ---- the flight: a time-based tween of `fly.t` (0 = in the beam, 1 = docked), launched by the
  // first scroll and reversed near the top. The pose is a pure function of (t, scroll), so a
  // retarget mid-flight continues from wherever the mark is.
  // (wheel / touch intent counts only once the preloader is gone and while the menu is closed)
  const intentRef = useRef(false);
  intentRef.current = revealed && !menuOpen;
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const hero = heroRef.current;
    if (!wrap || !hero || !mark) return;
    let A = hero.offsetHeight;
    let top = 0; // the hero's document y
    const measure = () => {
      A = hero.offsetHeight;
      top = wrap.getBoundingClientRect().top + window.scrollY;
    };
    measure();
    const scrollPos = () => Math.max(0, window.scrollY - top);

    const fly = { t: 0 };
    let goal = 0;
    let tween = null;
    let lastY = scrollPos();
    let parked = false; // docked and the hero fully scrolled away: nothing to repaint
    // the shell resets the scroll right after this effect (route change, index.jsx): until that
    // has landed, the mark takes its state without flying (nothing flies on a route change)
    let settling = true;
    let settleRaf = requestAnimationFrame(() => {
      settleRaf = requestAnimationFrame(() => {
        settling = false;
      });
    });

    const apply = () => {
      const L = layoutRef.current;
      const y = scrollPos();
      const t = fly.t;
      const dock = mark.dockPose();
      const M = L.mark;
      let pose;
      let lift = 0;
      let k = 0; // the dock crossfade: live hologram → the bar's static print
      if (reduced) {
        // no flight: the mark scrolls with the hero like any element and crossfades in place
        lift = t;
        k = t;
        pose =
          t >= 1
            ? { ...dock, op: 0 }
            : { x: M.x, y: M.y - y, h: M.h, yaw: HERO_YAW, pitch: HERO_PITCH, op: 1 - t, z: Z.page };
      } else {
        lift = out(sub(t, 0, 0.45));
        // the beam pose follows the scroll up to the threshold and holds there once the mark is
        // under way, so a fling never carries the launch point off screen
        const baseY = M.y - Math.min(y, THRESHOLD);
        if (t <= 0) {
          pose = { x: M.x, y: M.y - y, h: M.h, yaw: HERO_YAW, pitch: HERO_PITCH, op: 1, z: Z.page };
        } else {
          // rise out of the beam → flip while shrinking → land in the slot. All channels start
          // with the flight (the lift leads: it is done by t = 0.45) and finish just before t = 1,
          // so the crossfade below happens over a mark that has already landed.
          const size = out(sub(t, 0, 0.94));
          const travel = out(sub(t, 0, 0.95));
          const flip = out(sub(t, 0, 0.92));
          const arc = Math.sin(Math.PI * travel);
          k = sub(t, 0.9, 1);
          pose = {
            x: lerp(M.x, dock.x, travel) + arc * (L.mobile ? 0 : L.W * 0.04),
            y: lerp(baseY, dock.y, travel) - arc * L.H * 0.05 - lift * (1 - travel) * L.H * 0.06,
            h: Math.exp(lerp(Math.log(M.h), Math.log(dock.h), size)),
            yaw: lerp(HERO_YAW, DOCK_YAW + TAU, flip),
            pitch: lerp(HERO_PITCH, DOCK_PITCH, flip) + Math.sin(Math.PI * flip) * 0.3,
            // the live box is screen-blended above the whole page (it cannot sit under the bar,
            // which lives in the pages' stacking context), so it fades out fully as the print
            // fades in; at t = 1 it is hidden and renders nothing
            op: 1 - k,
            z: t > 0.15 ? Z.dock : Z.page,
          };
        }
      }
      mark.rt.signal.lift = lift;
      // (the CSS projector, if it is showing, dims with it too)
      hero.style.setProperty("--stage-lift", lift.toFixed(3));
      mark.push(OWNER, pose);
      if (mark.owns(OWNER)) setStaticMark(k);
      stateRef.current.c = t;
      syncPropsRef.current();
      // the hero owns the room's light while it is on stage (as before: until 40 % of the hero)
      // and for as long as the mark is still in the air
      if (light) {
        if (t < 1 || y < A * 0.4) {
          if (!light.owns(LIGHT)) {
            const heroTop = hero.getBoundingClientRect().top;
            light.claim(LIGHT, { x: pool.current.x, y: pool.current.y + heroTop, r: poolRadius(window.innerWidth), f: 1 });
          } else pushLightRef.current();
        } else light.release(LIGHT);
      }
      // the copy fades and rises with the scroll: gone at 24 % of the hero
      if (copyRef.current) {
        const q = reduced ? 0 : seg(y, 0, A * 0.24);
        copyRef.current.style.opacity = (1 - q).toFixed(3);
        copyRef.current.style.transform = `translate3d(0, ${(-q * 24).toFixed(1)}px, 0)`;
      }
      parked = t >= 1 && y > A && !tween;
    };

    const go = (to) => {
      if (to === goal) return;
      goal = to;
      tween?.kill();
      tween = null;
      const dist = Math.abs(to - fly.t);
      if (dist < 1e-4 || settling) {
        fly.t = to;
        apply();
        return;
      }
      // a partial (reversed) flight takes proportionally less time, never a snap
      const dur = reduced ? FADE_S * dist : Math.max(FLIGHT_MIN_S, FLIGHT_S * dist);
      tween = gsap.to(fly, {
        t: to,
        duration: dur,
        ease: reduced ? "none" : FLIGHT_EASE,
        onUpdate: apply,
        onComplete: () => {
          tween = null;
          apply();
        },
      });
    };

    // loaded (or restored) below the threshold: start docked, no flight
    if (scrollPos() > THRESHOLD) {
      goal = 1;
      fly.t = 1;
    }

    // ---- input. A scroll position past the threshold docks the mark; moving back up within it
    // returns it. Zoom and viewport changes are not scrolling (see VIEWPORT_SETTLE_MS).
    const vv = window.visualViewport;
    const zoomed = () => Math.abs((vv?.scale ?? 1) - 1) > ZOOM_EPSILON;
    let pinching = false; // two (or more) fingers are down, until the last one lifts
    let touchY = null;
    let suspendUntil = 0;
    let settleTimer = 0;
    let gestured = false; // a zoom / pinch happened inside the current settle window
    let baseY = 0; // the scroll when the current settle window opened
    const decide = (y, prevY) => {
      if (y > THRESHOLD) go(1);
      else if (y < prevY) go(0);
    };
    const suspend = (gesture) => {
      const now = performance.now();
      if (now >= suspendUntil) {
        baseY = scrollPos();
        gestured = false;
      }
      if (gesture) gestured = true;
      suspendUntil = now + VIEWPORT_SETTLE_MS;
      lastY = scrollPos();
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        suspendUntil = 0;
        const y = scrollPos();
        if (!gestured && !pinching && !zoomed()) decide(y, baseY);
        gestured = false;
        lastY = y;
        apply();
      }, VIEWPORT_SETTLE_MS);
    };
    const onScroll = () => {
      const y = scrollPos();
      if (zoomed() || pinching || performance.now() < suspendUntil) {
        // re-pose only: the mark follows the hero, its goal stays
        lastY = y;
        apply();
        return;
      }
      decide(y, lastY);
      lastY = y;
      if (!(parked && y > A)) apply();
    };
    // a resize or a visual-viewport change keeps the goal (it is not navigation intent)
    const onViewportChange = () => {
      suspend(zoomed() || pinching);
      measure();
      apply();
    };
    // intent at the very top (a wheel or swipe that has not scrolled the page yet), only once the
    // preloader is gone (its own skip-on-wheel must not launch the mark under the overlay)
    const onWheel = (e) => {
      // trackpad pinch-zoom arrives as a ctrl+wheel
      if (e.ctrlKey) {
        suspend(true);
        return;
      }
      if (zoomed() || pinching || !intentRef.current || scrollPos() > THRESHOLD) return;
      if (e.deltaY > 0) go(1);
      else if (e.deltaY < 0) go(0);
    };
    const onTouchStart = (e) => {
      if (e.touches.length > 1) {
        pinching = true;
        touchY = null;
        suspend(true);
      } else if (!pinching && !zoomed()) touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e) => {
      if (e.touches.length !== 1) {
        pinching = true;
        touchY = null;
        suspend(true);
        return;
      }
      if (pinching || touchY === null || zoomed() || !intentRef.current || scrollPos() > THRESHOLD) return;
      const dy = touchY - e.touches[0].clientY;
      if (dy > TOUCH_INTENT) go(1);
      else if (dy < -TOUCH_INTENT) go(0);
    };
    const onTouchEnd = (e) => {
      if (pinching) suspend(true);
      if (e.touches.length === 0) {
        pinching = false;
        touchY = null;
      }
    };
    // ScrollTrigger may scroll the page while it measures: no decisions until it has settled
    const onRefreshInit = () => suspend(false);
    const onRefresh = () => {
      suspend(false);
      measure();
      apply();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", onViewportChange);
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
    ScrollTrigger.addEventListener("refresh", onRefresh);
    apply();
    // late layout (images, faces): one coalesced refresh each, dropped if the hero is gone
    let alive = true;
    const cancels = [];
    const onLoad = () => cancels.push(scheduleRefresh());
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => {
      if (alive) cancels.push(scheduleRefresh());
    });
    return () => {
      alive = false;
      cancels.forEach((cancel) => cancel());
      cancelAnimationFrame(settleRaf);
      clearTimeout(settleTimer);
      tween?.kill();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("load", onLoad);
      ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      light?.release(LIGHT);
    };
  }, [reduced, mark, light]);

  // re-pose for a new layout (resize)
  useEffect(() => scheduleRefresh(), [layout]);

  // ---- intro copy, held until the preloader starts to dissolve
  const introRan = useRef(false);
  useLayoutEffect(() => {
    if (reduced || introRan.current) return;
    const copy = copyRef.current;
    if (!copy) return;
    // "We are", "DVM", the line
    const parts = copy.querySelectorAll("[data-intro]");
    gsap.set(parts, { autoAlpha: 0, y: 24 });
    if (!revealed) return;
    introRan.current = true;
    const intro = gsap.timeline({ delay: 0.45 });
    intro.to(parts, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power3.out" }, 0);
    return () => {
      intro.progress(1).kill();
    };
  }, [revealed, reduced]);

  return (
    <div ref={wrapRef} className={s.wrap}>
      <section
        ref={heroRef}
        id="top"
        className={s.hero}
        data-v8-stage=""
        data-phase={phase}
        data-light="50% 42% 34vw"
        aria-labelledby="v8-hero-title"
      >
        <div className={s.canvas} aria-hidden="true">
          {mark ? (
            // no WebGL / a lost context: the same projector drawn in SVG (while a fresh canvas
            // is tried; for good only after repeated failures)
            <GLBoundary
              fallback={<StageFallback W={layout.W} H={layout.H} narrow={narrow} className={s.fallback} />}
              errorRetries={STAGE_ERROR_RETRIES}
              lossRetries={STAGE_LOSS_RETRIES}
              onFail={onStageFail}
              onRecover={onStageRecover}
            >
              {(onLost, attempt) => (
                <HeroStage
                  key={attempt}
                  rt={mark.rt}
                  reduced={reduced}
                  narrow={narrow}
                  active={active}
                  revealed={revealed}
                  container={heroRef}
                  onPhase={onPhase}
                  onLost={() => {
                    stageNote({ contextLost: true });
                    onLost();
                  }}
                />
              )}
            </GLBoundary>
          ) : (
            <div className={s.idle} />
          )}
        </div>
        <div className={s.grid} aria-hidden="true" />
        <div ref={textureRef} className={s.texture} style={{ backgroundImage: `url(${bg3})` }} aria-hidden="true" />

        {debug && mark && <StageDebug rt={mark.rt} />}

        <div ref={copyRef} className={s.copy}>
          <h1 id="v8-hero-title" className={s.title}>
            <span data-intro="">We are</span> <span data-intro="">DVM</span>
          </h1>
          <p className={s.lede} data-intro="">
            The websites, apps and films behind BITS Pilani&rsquo;s fests.
          </p>
        </div>
      </section>
    </div>
  );
}
