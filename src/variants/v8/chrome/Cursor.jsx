// V8's one cursor (research/v8-round5.md §3): the hero's reticle, made site-wide. A 4 px dot
// that sits on the pointer and a 24 px ring that follows it with a short exponential lag; the
// ring changes shape by what is under the pointer (data-state on the root):
//   default · link · stage (the hero: 28 px + a teal tick) · grab / grabbing (the archive wall:
//   corner brackets) · press · text (hidden: the native I-beam shows) · hidden (over the hub
//   switcher, outside the window, tab hidden, touch input).
//
// The link rule (one rule for the whole site, so siblings never disagree):
//   - a compact control (a text link, button, tab, chip, nav / menu item, social, thumbnail:
//     one box up to LOCK_MAX_W × LOCK_MAX_H) is LOCKED onto: the ring morphs to its box + 8 px
//     a side (a round control gets a round ring);
//   - a large surface (a card, image tile, roster row, blog row) gets the 40 px teal circle;
//   - an inline link that wraps onto two lines never locks (its box would be the odd shape the
//     two line boxes span): it gets the circle too.
// Components state intent where size alone would guess wrong, with data-cursor on the element:
//   "lock" (always lock, whatever its size; e.g. the menu's big items, the legacy nodes) ·
//   "link" (always the circle) · "none" (not a pointer target, even if it is a link or button) ·
//   "grab" (a region: its draggable surface gets the brackets; the archive wall) ·
//   "dot" (a region where the pointer is the 4 px dot only, teal, and no ring at all: a field of
//   round controls that light up themselves, where the ring would read as one more of them — the
//   /alumni wall, map and the people branching out of a company).
// Mounted by index.jsx only for fine, hovering pointers; the shell then sets
// data-cursor="custom" on .root, which hides the native cursor (v8.module.css). Nothing here
// intercepts an event: all three elements are pointer-events: none, focus rings are untouched.
// One rAF loop, started by input and stopped once the ring has settled. Transforms only.
// Reduced motion: the ring sits on the dot (no lag) and states change instantly.
import { useEffect, useRef } from "react";
import s from "./cursor.module.css";

/** Pointer targets by nature (plus the archive kit's minimap, a click-to-travel canvas). */
const INTERACTIVE = [
  "a[href]",
  "button:not(:disabled)",
  "summary",
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  ".imm-archive-mini canvas",
].join(", ");
/** The nearest of these to the pointer decides: a declared intent, or a target by nature. */
const TARGET = `${INTERACTIVE}, [data-cursor="lock"], [data-cursor="link"], [data-cursor="none"]`;
const TEXT = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
const STAGE = "[data-v8-stage]";
const GRAB = '[data-cursor="grab"]';
/** A region where the pointer is the dot alone (its controls show their own hover). */
const DOT = '[data-cursor="dot"]';
/** Inside a grab area, only the draggable surface itself (the archive kit's wall canvas, the
 *  element its CSS gives `cursor: grab`) gets the brackets; its dossier, HUD and minimap don't. */
const GRAB_SURFACE = "canvas.imm-archive-canvas, [data-cursor-surface]";
const SWITCHER = "[data-dvm-switcher]";
/** Targets up to this box (px) are compact controls and get the lock-on ring; bigger ones the
 *  40 px circle. 64 clears every one-line control (a 42 px button, a 44 px nav control, a 60 px
 *  thumbnail); 420 clears the longest one-line text link, never a card. */
const LOCK_MAX_W = 420;
const LOCK_MAX_H = 64;
/** The locked ring's margin around the target (fixed, so big targets don't get fat rings). */
const LOCK_PAD = 8;
/** Ring lag (ms): the time constant of `r += (p − r)(1 − e^(−dt/τ))`. */
const TAU = 70;
const TAU_TIGHT = 45;

/** Can the ring lock onto `el`? Exactly one box (an inline link split over two lines has one
 *  per line), not empty, and compact unless the component asked for the lock. */
function lockable(el, forced) {
  const rects = el.getClientRects();
  if (rects.length !== 1) return false;
  const r = rects[0];
  if (r.width <= 0 || r.height <= 0) return false;
  return forced || (r.width <= LOCK_MAX_W && r.height <= LOCK_MAX_H);
}

/** A round target (border-radius at least half its short side) gets a round ring. */
function isRound(el) {
  const r = el.getBoundingClientRect();
  const br = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  return br > 0 && br >= Math.min(r.width, r.height) / 2 - 0.5;
}

export default function Cursor() {
  const rootRef = useRef(null);
  const dotRef = useRef(null);
  const tickRef = useRef(null);
  const ringRef = useRef(null);
  const shapeRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const dot = dotRef.current;
    const tick = tickRef.current;
    const ring = ringRef.current;
    const shape = shapeRef.current;
    if (!root || !dot || !tick || !ring || !shape) return;
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const st = {
      x: 0,
      y: 0,
      rx: 0,
      ry: 0,
      /** a position is known and the ring is where it should start from */
      placed: false,
      target: null,
      /** the state came from the archive wall (re-checked per frame, see frame()) */
      wall: false,
      down: false,
      /** the small link the ring is locked onto, and its last size */
      lock: null,
      lw: 0,
      lh: 0,
      state: "hidden",
      press: false,
      raf: 0,
      last: 0,
    };

    const setState = (state) => {
      if (state === st.state) return;
      st.state = state;
      root.dataset.state = state;
    };
    const setPress = (on) => {
      if (on === st.press) return;
      st.press = on;
      if (on) root.dataset.press = "";
      else delete root.dataset.press;
    };
    const setLock = (el) => {
      if (el === st.lock) return;
      st.lock = el;
      st.lw = st.lh = 0;
      if (el) {
        root.dataset.lock = isRound(el) ? "round" : "";
      } else delete root.dataset.lock;
    };
    const sizeLock = () => {
      const r = st.lock.getBoundingClientRect();
      const w = Math.round(r.width + LOCK_PAD * 2);
      const h = Math.round(r.height + LOCK_PAD * 2);
      if (w !== st.lw || h !== st.lh) {
        st.lw = w;
        st.lh = h;
        shape.style.setProperty("--lw", `${w}px`);
        shape.style.setProperty("--lh", `${h}px`);
      }
      return r;
    };

    /** What is under the pointer → state (and the lock target). */
    const resolve = (t) => {
      st.target = t instanceof Element ? t : null;
      st.wall = false;
      if (!st.target) {
        setLock(null);
        setState("default");
        return;
      }
      if (t.closest(SWITCHER)) {
        setLock(null);
        setState("hidden");
        return;
      }
      if (t.closest(TEXT)) {
        setLock(null);
        setState("text");
        return;
      }
      if (t.closest(DOT)) {
        setLock(null);
        setState("dot");
        return;
      }
      const hit = t.closest(TARGET);
      const intent = hit?.getAttribute("data-cursor");
      if (hit && intent !== "none") {
        setLock(intent !== "link" && lockable(hit, intent === "lock") ? hit : null);
        setState("link");
        return;
      }
      setLock(null);
      if (t.closest(GRAB) && t.matches(GRAB_SURFACE)) {
        // (the wall's canvas asks for a pointer over a tile: the tile is a link)
        st.wall = true;
        const tile = t instanceof HTMLElement && t.style.cursor === "pointer";
        setState(tile && !st.down ? "link" : st.down ? "grabbing" : "grab");
        return;
      }
      setState(t.closest(STAGE) ? "stage" : "default");
    };

    const paint = () => {
      const d = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0)`;
      dot.style.transform = d;
      tick.style.transform = d;
      ring.style.transform = `translate3d(${st.rx.toFixed(2)}px, ${st.ry.toFixed(2)}px, 0)`;
    };

    const frame = (now) => {
      const dt = st.last ? Math.min(64, now - st.last) : 16;
      st.last = now;
      // the archive wall flips its canvas between grab and pointer without a pointerover
      if (st.wall && st.target) resolve(st.target);
      let tx = st.x;
      let ty = st.y;
      if (st.lock) {
        if (!st.lock.isConnected) setLock(null);
        else {
          const r = sizeLock();
          tx = r.left + r.width / 2;
          ty = r.top + r.height / 2;
        }
      }
      const tau = mqReduced.matches ? 0 : st.state === "link" || st.state === "grabbing" ? TAU_TIGHT : TAU;
      const a = tau > 0 ? 1 - Math.exp(-dt / tau) : 1;
      st.rx += (tx - st.rx) * a;
      st.ry += (ty - st.ry) * a;
      const settled = Math.abs(tx - st.rx) < 0.1 && Math.abs(ty - st.ry) < 0.1;
      if (settled) {
        st.rx = tx;
        st.ry = ty;
      }
      paint();
      if (settled) {
        st.raf = 0;
        st.last = 0;
        return;
      }
      st.raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!st.raf && !document.hidden) st.raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      if (e.pointerType === "touch") {
        setState("hidden");
        return;
      }
      st.x = e.clientX;
      st.y = e.clientY;
      if (!st.placed || st.state === "hidden") {
        // first sight (or back from outside / a hidden tab): appear on the pointer, no fly-in
        if (!st.placed) {
          st.rx = st.x;
          st.ry = st.y;
        }
        st.placed = true;
        resolve(e.target);
      }
      kick();
    };
    const onOver = (e) => {
      if (e.pointerType === "touch") return;
      resolve(e.target);
      kick();
    };
    const onOut = (e) => {
      // leaving the window
      if (!e.relatedTarget) {
        setLock(null);
        setState("hidden");
      }
    };
    const onDown = (e) => {
      if (e.pointerType === "touch") return;
      st.down = true;
      if (st.state === "grab") setState("grabbing");
      else if (st.state === "default" || st.state === "link" || st.state === "stage") setPress(true);
      kick();
    };
    const onUp = () => {
      st.down = false;
      setPress(false);
      if (st.state === "grabbing") {
        if (st.target) resolve(st.target);
        else setState("grab");
      }
      kick();
    };
    const onVisibility = () => {
      if (!document.hidden) return;
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.last = 0;
      setLock(null);
      setState("hidden");
    };
    // a locked ring follows its target as the page scrolls under a still pointer
    const onScroll = () => {
      if (st.lock) kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true, capture: true });
    window.addEventListener("pointerup", onUp, { passive: true, capture: true });
    window.addEventListener("pointercancel", onUp, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(st.raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
      window.removeEventListener("pointercancel", onUp, { capture: true });
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={rootRef} className={s.cursor} data-state="hidden" aria-hidden="true">
      <div ref={ringRef} className={s.ring}>
        <div ref={shapeRef} className={s.shape}>
          <span className={s.bracket} />
          <span className={s.bracket} />
        </div>
      </div>
      <div ref={tickRef} className={s.tick} />
      <div ref={dotRef} className={s.dot} />
    </div>
  );
}
