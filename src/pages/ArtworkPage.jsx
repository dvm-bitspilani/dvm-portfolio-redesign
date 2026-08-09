import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom"

import Navbar from "../components/Navbar"
import Ham from "../components/Ham";
import ArtworkCard from "../components/ArtworkCard";
import artworks from "../data/artworks";

import "../components/ArtworkPage.css";

const CELL = 11.5;
const SPOT_RADIUS = 260;

// four slots on screen at a time on desktop; below the 768px breakpoint the
// net's vertical inner curve is removed (see ArtworkPage.css), leaving only
// a top/bottom split, so only 2 cards fit on screen at once there
const CARDS_PER_PAGE_DESKTOP = 4;
const CARDS_PER_PAGE_MOBILE = 2;
const MOBILE_BREAKPOINT = 768;

// must match the transition duration on #stage .card in ArtworkPage.css
const FADE_MS = 320;

// total run time of the click pulse in triggerPulse(), i.e. straighten (0.55)
// + flood (0.5) + hold/shrink (0.25 + 0.6) + un-straighten (0.6). Only used as
// a safety net: the real "cards may come back now" signal is the pulse's own
// completion callback, and this just guarantees they never stay hidden if that
// callback is somehow lost.
const PULSE_MS = 2500;

// corners are pinned only to the LEFT and RIGHT edges of the viewport
// (x = 0 or x = w). Their y positions sit inset from top/bottom, leaving
// room above and below the net for other page content.
const CORNERS = {
  TL: [0, 0.115], TR: [1, 0.10],
  BR: [1, 0.86], BL: [0, 0.88]
};

// fixed "bow" amount for the outer curves (the axis NOT driven by the mouse) —
// control points sit further inside the viewport than their edge-pinned
// endpoints, so each edge sags inward.
const BOW = {
  leftX: 0.06, rightX: 0.94,   // left/right edges bow inward horizontally
  topY: 0.16, bottomY: 0.82    // top/bottom edges bow inward vertically
};

// how far the mouse can push the outer curves' control points (wider = more bend)
const OUTER_RANGE = { lo: 0.06, hi: 0.94 };

// how strongly the inner curves' "fixed" axis reacts to the cross-mouse coordinate
const INNER_CROSS_AMPLITUDE = 0.22;

// amplify the top/bottom outer curves' reaction to the mouse a bit more than 1:1
const TOP_BOTTOM_AMPLIFY = 1.35;

// damp the inner vertical curve's reaction to the mouse's main axis (less responsive)
const INNER_V_MAIN_AMPLITUDE = 0.55;

// net-shape mouse position ease factor: `target` is set immediately from raw
// input (and reset to the centre whenever the cursor is outside the net);
// `smooth` eases toward it every frame so entering/leaving the net glides
// instead of snapping.
const NET_EASE = 0.14;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPt(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
function s(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }
function fpt(f, w, h) { return [f[0] * w, f[1] * h]; }
function quadPoint(p0, c, p1, t) {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * c[0] + t * t * p1[0],
    mt * mt * p0[1] + 2 * mt * t * c[1] + t * t * p1[1]
  ];
}

export default function ArtworkPage() {
  const stageRef = useRef(null);
  const baseGridRef = useRef(null);
  const netLinesRef = useRef(null);
  const glowGridRef = useRef(null);
  const blurLayerRef = useRef(null);
  const sharpLayerRef = useRef(null);
  const coreRef = useRef(null);
  const coreWrapRef = useRef(null);
  const spotlightGradRef = useRef(null);
  const arrowLeftRef = useRef(null);
  const arrowRightRef = useRef(null);
  const cardLayerRef = useRef(null);

  // the net effect lives entirely inside the big useEffect below; this ref is
  // the one door out of it, so the paging logic can start a pulse and be told
  // when the curves have finished settling back
  const startPulseRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    const baseGrid = baseGridRef.current;
    const netLines = netLinesRef.current;
    const glowGrid = glowGridRef.current;
    const blurLayer = blurLayerRef.current;
    const sharpLayer = sharpLayerRef.current;
    const core = coreRef.current;
    const coreWrap = coreWrapRef.current;
    const spotlightGrad = spotlightGradRef.current;

    if (!stage) return;

    // mutable per-instance state, scoped to this effect run so it behaves
    // exactly like the original module-level variables but is cleaned up
    // whenever the component unmounts / re-runs the effect
    let targetMouseX = window.innerWidth / 2;
    let targetMouseY = window.innerHeight / 2;
    let smoothMouseX = targetMouseX;
    let smoothMouseY = targetMouseY;

    // 0 = normal curved net, 1 = outer curves fully straightened (click effect)
    let straightenT = 0;

    // spotlight radius: normally SPOT_RADIUS, temporarily grown during the
    // click "flood the net with blue" effect
    let currentSpotRadius = SPOT_RADIUS;
    let pulseActive = false;

    // fixed anchor points for the inner curves — computed once (at rest, i.e.
    // as if the mouse were at the exact centre) so they never move, no matter
    // where the cursor goes. Recomputed only on resize.
    let leftMidAnchor, rightMidAnchor, topMidAnchor, bottomMidAnchor;
    let hStraightMid, vStraightMid;

    let outerPathEls = [];
    let innerPathEls = [];

    function computeAnchors(w, h) {
      const TL = fpt(CORNERS.TL, w, h);
      const TR = fpt(CORNERS.TR, w, h);
      const BR = fpt(CORNERS.BR, w, h);
      const BL = fpt(CORNERS.BL, w, h);

      // "rest" control points, as if the mouse sat exactly at the centre
      const leftCtrlRest = [BOW.leftX * w, h / 2];
      const rightCtrlRest = [BOW.rightX * w, h / 2];
      const topCtrlRest = [w / 2, BOW.topY * h];
      const bottomCtrlRest = [w / 2, BOW.bottomY * h];

      leftMidAnchor = quadPoint(BL, leftCtrlRest, TL, 0.5);
      rightMidAnchor = quadPoint(TR, rightCtrlRest, BR, 0.5);
      topMidAnchor = quadPoint(TL, topCtrlRest, TR, 0.5);
      bottomMidAnchor = quadPoint(BR, bottomCtrlRest, BL, 0.5);

      hStraightMid = [(leftMidAnchor[0] + rightMidAnchor[0]) / 2, (leftMidAnchor[1] + rightMidAnchor[1]) / 2];
      vStraightMid = [(topMidAnchor[0] + bottomMidAnchor[0]) / 2, (topMidAnchor[1] + bottomMidAnchor[1]) / 2];
    }

    function computeNet(w, h) {
      const TL = fpt(CORNERS.TL, w, h);
      const TR = fpt(CORNERS.TR, w, h);
      const BR = fpt(CORNERS.BR, w, h);
      const BL = fpt(CORNERS.BL, w, h);

      // vertical edges (left/right): control point's Y follows the mouse's Y,
      // control point's X stays fixed, bowing the curve inward from the edge
      const loY = OUTER_RANGE.lo * h, hiY = OUTER_RANGE.hi * h;
      const leftCtrl = [BOW.leftX * w, clamp(smoothMouseY, loY, hiY)];
      const rightCtrl = [BOW.rightX * w, clamp(smoothMouseY, loY, hiY)];

      // horizontal edges (top/bottom): control point's X follows the mouse's X,
      // control point's Y stays fixed, bowing the curve inward from the edge.
      // The mouse's deviation from center is amplified so these two edges bend
      // a bit more eagerly than the left/right edges do.
      const loX = OUTER_RANGE.lo * w, hiX = OUTER_RANGE.hi * w;
      const ampMouseX = w / 2 + (smoothMouseX - w / 2) * TOP_BOTTOM_AMPLIFY;
      const topCtrl = [clamp(ampMouseX, loX, hiX), BOW.topY * h];
      const bottomCtrl = [clamp(ampMouseX, loX, hiX), BOW.bottomY * h];

      // inner curves: endpoints are the FIXED anchors (never move). The control
      // point's primary axis follows the mouse (same as before); its other axis,
      // which used to be pinned to the straight-line baseline, now also drifts
      // a little with the cross-axis mouse coordinate — so both curves genuinely
      // react to the full mouse position, while still resolving to a straight
      // line when the mouse sits at the centre.
      const hLo = Math.min(leftMidAnchor[0], rightMidAnchor[0]) + 10;
      const hHi = Math.max(leftMidAnchor[0], rightMidAnchor[0]) - 10;
      const vLo = Math.min(topMidAnchor[1], bottomMidAnchor[1]) + 10;
      const vHi = Math.max(topMidAnchor[1], bottomMidAnchor[1]) - 10;

      const hCrossOffset = (smoothMouseY - h / 2) * INNER_CROSS_AMPLITUDE;
      const vCrossOffset = (smoothMouseX - w / 2) * INNER_CROSS_AMPLITUDE;

      const hMidCtrl = [
        clamp(smoothMouseX, hLo, hHi),
        clamp(hStraightMid[1] + hCrossOffset, 0.1 * h, 0.9 * h)
      ];
      const vMainY = h / 2 + (smoothMouseY - h / 2) * INNER_V_MAIN_AMPLITUDE;
      const vMidCtrl = [
        clamp(vStraightMid[0] + vCrossOffset, 0.1 * w, 0.9 * w),
        clamp(vMainY, vLo, vHi)
      ];

      // outer four curves blend toward straight lines (control point = midpoint
      // of their own endpoints) for the click "straighten" effect
      const topCtrlFinal = lerpPt(topCtrl, [(TL[0] + TR[0]) / 2, (TL[1] + TR[1]) / 2], straightenT);
      const rightCtrlFinal = lerpPt(rightCtrl, [(TR[0] + BR[0]) / 2, (TR[1] + BR[1]) / 2], straightenT);
      const bottomCtrlFinal = lerpPt(bottomCtrl, [(BR[0] + BL[0]) / 2, (BR[1] + BL[1]) / 2], straightenT);
      const leftCtrlFinal = lerpPt(leftCtrl, [(BL[0] + TL[0]) / 2, (BL[1] + TL[1]) / 2], straightenT);

      const closed = `M ${s(TL)} Q ${s(topCtrlFinal)} ${s(TR)} Q ${s(rightCtrlFinal)} ${s(BR)} Q ${s(bottomCtrlFinal)} ${s(BL)} Q ${s(leftCtrlFinal)} ${s(TL)} Z`;
      const topEdge = `M ${s(TL)} Q ${s(topCtrlFinal)} ${s(TR)}`;
      const rightEdge = `M ${s(TR)} Q ${s(rightCtrlFinal)} ${s(BR)}`;
      const bottomEdge = `M ${s(BR)} Q ${s(bottomCtrlFinal)} ${s(BL)}`;
      const leftEdge = `M ${s(BL)} Q ${s(leftCtrlFinal)} ${s(TL)}`;
      const hMid = `M ${s(leftMidAnchor)} Q ${s(hMidCtrl)} ${s(rightMidAnchor)}`;
      const vMid = `M ${s(topMidAnchor)} Q ${s(vMidCtrl)} ${s(bottomMidAnchor)}`;

      return { closed, topEdge, rightEdge, bottomEdge, leftEdge, hMid, vMid };
    }

    function ensureNetElements() {
      if (outerPathEls.length) return;
      const ns = 'http://www.w3.org/2000/svg';
      ['topEdge', 'rightEdge', 'bottomEdge', 'leftEdge'].forEach(() => {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('class', 'outer');
        netLines.appendChild(p);
        outerPathEls.push(p);
      });
      ['hMid', 'vMid'].forEach(() => {
        const p = document.createElementNS(ns, 'path');
        netLines.appendChild(p);
        innerPathEls.push(p);
      });
    }

    function drawNet() {
      const w = window.innerWidth, h = window.innerHeight;
      ensureNetElements();
      const net = computeNet(w, h);

      outerPathEls[0].setAttribute('d', net.topEdge);
      outerPathEls[1].setAttribute('d', net.rightEdge);
      outerPathEls[2].setAttribute('d', net.bottomEdge);
      outerPathEls[3].setAttribute('d', net.leftEdge);
      innerPathEls[0].setAttribute('d', net.hMid);
      innerPathEls[1].setAttribute('d', net.vMid);

      const clip = `path('${net.closed}')`;
      glowGrid.style.clipPath = clip;
      coreWrap.style.clipPath = clip;
    }

    // point-in-polygon test built directly from the four outer <path> elements'
    // current, on-screen geometry, so it always matches the net exactly as drawn
    function isInsideNet(x, y) {
      if (!outerPathEls.length || !outerPathEls[0].getTotalLength) return true;
      const poly = [];
      outerPathEls.forEach(path => {
        const len = path.getTotalLength();
        if (!len) return;
        const steps = 16;
        for (let i = 0; i <= steps; i++) {
          const p = path.getPointAtLength(len * i / steps);
          poly.push([p.x, p.y]);
        }
      });
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    // are we over one of the artwork cards? The cards are plain rectangles, so
    // their bounding boxes are an exact hit-test. Cards that are mid-fade are
    // ignored: they're transparent and pointer-events:none, so hovering the
    // space they occupy shouldn't count as hovering a card.
    function isOverCard(x, y) {
      const layer = cardLayerRef.current;
      if (!layer || layer.classList.contains('is-fading')) return false;
      const cards = layer.querySelectorAll('.card');
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
      }
      return false;
    }

    function makeLine(x1, y1, x2, y2) {
      const ns = 'http://www.w3.org/2000/svg';
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      return line;
    }

    function buildGrid() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      [baseGrid, blurLayer, sharpLayer].forEach(el => {
        while (el.firstChild) el.removeChild(el.firstChild);
      });

      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;

      for (let c = 0; c <= cols; c++) {
        const x = c * CELL;
        baseGrid.appendChild(makeLine(x, 0, x, h));
        blurLayer.appendChild(makeLine(x, 0, x, h));
        sharpLayer.appendChild(makeLine(x, 0, x, h));
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * CELL;
        baseGrid.appendChild(makeLine(0, y, w, y));
        blurLayer.appendChild(makeLine(0, y, w, y));
        sharpLayer.appendChild(makeLine(0, y, w, y));
      }

      targetMouseX = w / 2;
      targetMouseY = h / 2;
      smoothMouseX = w / 2;
      smoothMouseY = h / 2;

      computeAnchors(w, h);
      drawNet();
    }

    function updatePointer(x, y) {
      stage.style.setProperty('--mx', x + 'px');
      stage.style.setProperty('--my', y + 'px');
      core.style.transform = `translate(${x - 23}px, ${y - 23}px)`;
      spotlightGrad.setAttribute('cx', x);
      spotlightGrad.setAttribute('cy', y);
    }

    // continuous per-frame loop: eases the net's tracked mouse position toward
    // its target (smooth entry/exit instead of an instant snap) and keeps the
    // spotlight radius in sync with any in-progress pulse animation
    function frameTick() {
      smoothMouseX = lerp(smoothMouseX, targetMouseX, NET_EASE);
      smoothMouseY = lerp(smoothMouseY, targetMouseY, NET_EASE);
      stage.style.setProperty('--sr', currentSpotRadius + 'px');
      spotlightGrad.setAttribute('r', currentSpotRadius);
      drawNet();
    }

    function handlePointer(x, y) {
      // the spotlight glow always follows the raw cursor (it's already
      // visually clipped to the net, so this is harmless outside it)
      updatePointer(x, y);

      const inside = isInsideNet(x, y);
      const overCard = isOverCard(x, y);

      // the glowing #core dot already acts as a custom cursor inside the
      // net, so the real OS cursor is hidden there and only reappears once
      // the pointer leaves the net's interior.
      // Cards are the exception: they hold real controls (social links), so
      // over a card the dot is faded out and the OS cursor handed back, which
      // also lets the link hover/pointer states read normally.
      stage.classList.toggle('cursor-hidden', inside && !overCard);
      stage.classList.toggle('core-hidden', overCard);

      // the net's curves ease toward the cursor while it's inside; once it
      // exits, the target resets to centre and they ease back to rest
      if (inside) {
        targetMouseX = x;
        targetMouseY = y;
      } else {
        targetMouseX = window.innerWidth / 2;
        targetMouseY = window.innerHeight / 2;
      }
    }

    let pulseTimeline = null;
    let pulseRafId = null;

    // Manual (GSAP-free) tween helper used as a fallback so the click pulse
    // still plays even if window.gsap isn't loaded on the page.
    function tweenValue({ from, to, duration, ease, onUpdate, onComplete, delay = 0 }) {
      const start = performance.now() + delay * 1000;
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const fn = ease === 'power2.out' ? easeOut : easeInOut;

      function step(now) {
        if (now < start) { pulseRafId = requestAnimationFrame(step); return; }
        const t = Math.min(1, (now - start) / (duration * 1000));
        onUpdate(from + (to - from) * fn(t));
        if (t < 1) {
          pulseRafId = requestAnimationFrame(step);
        } else if (onComplete) {
          onComplete();
        }
      }
      pulseRafId = requestAnimationFrame(step);
    }

    // click-triggered pulse: straighten the outer curves, flood the net blue,
    // fade back, then ease the curves back to their normal shape.
    //
    // `onDone` fires on the very last frame of that sequence - i.e. once
    // straightenT is back at 0 and every quadratic curve has returned to its
    // resting shape - which is the cue the card layer waits on before fading
    // the new page in. Returns false (without calling onDone) if a pulse is
    // already running, so the caller can leave the page alone.
    function triggerPulse(onDone) {
      if (pulseActive) return false;
      pulseActive = true;

      const finish = () => {
        pulseActive = false;
        if (onDone) onDone();
      };

      const gsap = typeof window !== 'undefined' ? window.gsap : undefined;

      if (typeof gsap !== 'undefined') {
        const state = { straighten: straightenT, radius: currentSpotRadius };
        pulseTimeline = gsap.timeline({ onComplete: finish })
          .to(state, {
            straighten: 1,
            duration: 0.55,
            ease: 'power2.inOut',
            onUpdate: () => { straightenT = state.straighten; }
          })
          .to(state, {
            radius: 2600,
            duration: 0.5,
            ease: 'power2.out',
            onUpdate: () => { currentSpotRadius = state.radius; }
          })
          .to(state, {
            radius: SPOT_RADIUS,
            duration: 0.6,
            ease: 'power2.inOut',
            delay: 0.25,
            onUpdate: () => { currentSpotRadius = state.radius; }
          })
          .to(state, {
            straighten: 0,
            duration: 0.6,
            ease: 'power2.inOut',
            onUpdate: () => { straightenT = state.straighten; }
          });
        return true;
      }

      // Fallback: no GSAP available, run the same sequence with rAF tweens
      tweenValue({
        from: straightenT, to: 1, duration: 0.55, ease: 'power2.inOut',
        onUpdate: (v) => { straightenT = v; },
        onComplete: () => {
          tweenValue({
            from: currentSpotRadius, to: 2600, duration: 0.5, ease: 'power2.out',
            onUpdate: (v) => { currentSpotRadius = v; },
            onComplete: () => {
              tweenValue({
                from: currentSpotRadius, to: SPOT_RADIUS, duration: 0.6, ease: 'power2.inOut',
                delay: 0.25,
                onUpdate: (v) => { currentSpotRadius = v; },
                onComplete: () => {
                  tweenValue({
                    from: straightenT, to: 0, duration: 0.6, ease: 'power2.inOut',
                    onUpdate: (v) => { straightenT = v; },
                    onComplete: finish
                  });
                }
              });
            }
          });
        }
      });

      return true;
    }

    const handleMouseMove = (e) => handlePointer(e.clientX, e.clientY);
    const handleMouseLeave = () => {
      updatePointer(-500, -500);
      stage.classList.remove('cursor-hidden');
      stage.classList.remove('core-hidden');
      targetMouseX = window.innerWidth / 2;
      targetMouseY = window.innerHeight / 2;
    };
    const handleTouchMove = (e) => {
      const t = e.touches[0];
      if (t) handlePointer(t.clientX, t.clientY);
    };

    buildGrid();
    window.addEventListener('resize', buildGrid);

    const gsap = typeof window !== 'undefined' ? window.gsap : undefined;
    let rafId = null;
    if (typeof gsap !== 'undefined') {
      gsap.ticker.add(frameTick);
    } else {
      const raf = () => {
        frameTick();
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }

    // The arrows no longer fire the pulse through their own listener. changePage
    // owns it now, so the page turn and the net animation share one lifecycle
    // (and keyboard activation gets the pulse too, which the old click-only
    // listener missed).
    startPulseRef.current = triggerPulse;

    stage.addEventListener('mousemove', handleMouseMove);
    stage.addEventListener('mouseleave', handleMouseLeave);
    stage.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('resize', buildGrid);
      stage.removeEventListener('mousemove', handleMouseMove);
      stage.removeEventListener('mouseleave', handleMouseLeave);
      stage.removeEventListener('touchmove', handleTouchMove);
      startPulseRef.current = null;

      const gsapCleanup = typeof window !== 'undefined' ? window.gsap : undefined;
      if (typeof gsapCleanup !== 'undefined') {
        gsapCleanup.ticker.remove(frameTick);
        if (pulseTimeline) pulseTimeline.kill();
      } else if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (pulseRafId !== null) cancelAnimationFrame(pulseRafId);
    };
  }, []);

  const [isHamOpen, setIsHamOpen] = useState(false)

  // ---- artwork paging -----------------------------------------------------
  const [cardsPerPage, setCardsPerPage] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
      ? CARDS_PER_PAGE_MOBILE
      : CARDS_PER_PAGE_DESKTOP
  );

  useEffect(() => {
    const onResize = () => {
      setCardsPerPage(
        window.innerWidth < MOBILE_BREAKPOINT
          ? CARDS_PER_PAGE_MOBILE
          : CARDS_PER_PAGE_DESKTOP
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const totalPages = Math.ceil(artworks.length / cardsPerPage);

  const [page, setPage] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // crossing the breakpoint changes totalPages - clamp the current page back
  // into range instead of leaving it pointing past the new last page
  useEffect(() => {
    setPage((p) => (p >= totalPages ? 0 : p));
  }, [totalPages]);

  // a ref, not the state value, guards the transition: state updates are
  // batched, so a fast double-click would otherwise read a stale `isFading`
  // and start a second page turn mid-fade.
  //
  // It now stays true for the whole net pulse, not just the 320ms fade, so
  // arrow presses land on exactly one page turn: further presses while the
  // curves are still moving are ignored outright rather than queueing up
  // another swap behind the animation.
  const isFadingRef = useRef(false);
  const fadeTimeoutRef = useRef(null);
  const fadeRafRef = useRef(null);
  const safetyTimeoutRef = useRef(null);

  const changePage = useCallback((direction) => {
    if (isFadingRef.current) return;
    isFadingRef.current = true;
    setIsFading(true);

    // swap the artworks while the layer is fully transparent
    fadeTimeoutRef.current = setTimeout(() => {
      setPage((p) => (p + direction + totalPages) % totalPages);
    }, FADE_MS);

    // drop the fading class on a later frame so the new cards animate in from
    // opacity 0 instead of appearing already opaque
    const revealCards = () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      fadeRafRef.current = requestAnimationFrame(() => {
        fadeRafRef.current = requestAnimationFrame(() => {
          setIsFading(false);
          isFadingRef.current = false;
        });
      });
    };

    // the cards come back only once the pulse has fully resolved and every
    // quadratic curve has eased back to its resting shape
    const started = startPulseRef.current
      ? startPulseRef.current(revealCards)
      : false;

    if (!started) {
      // nothing to wait on (net effect not mounted, or a pulse is somehow
      // already running) - fall back to the plain fade timing
      safetyTimeoutRef.current = setTimeout(revealCards, FADE_MS);
      return;
    }

    safetyTimeoutRef.current = setTimeout(revealCards, PULSE_MS + 600);
  }, [totalPages]);

  useEffect(() => () => {
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
  }, []);

  const visibleArtworks = artworks.slice(
    page * cardsPerPage,
    page * cardsPerPage + cardsPerPage
  );

  return (
    <div id="stage" ref={stageRef}>
      <Navbar onHamClick={() => setIsHamOpen(true)} />
      {isHamOpen && <Ham onClose={() => setIsHamOpen(false)} />}

      <h1 id="artwork-heading">ARTWORK</h1>

      <svg id="baseGrid" ref={baseGridRef}></svg>
      <svg id="netLines" ref={netLinesRef}></svg>
      <svg id="glowGrid" ref={glowGridRef}>
        <defs>
          <radialGradient
            id="spotlightGrad"
            ref={spotlightGradRef}
            gradientUnits="userSpaceOnUse"
            cx="-500"
            cy="-500"
            r="260"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#cfe8ff" />
            <stop offset="100%" stopColor="#5aa8ff" />
          </radialGradient>
        </defs>
        <g className="glowBlur" ref={blurLayerRef}></g>
        <g className="glowSharp" ref={sharpLayerRef}></g>
      </svg>

      <div
        className={`card-layer${isFading ? " is-fading" : ""}`}
        ref={cardLayerRef}
      >
        {visibleArtworks.map((artwork, i) => (
          // slot ids stay card1..card4 - the CSS that positions the four
          // quadrants is untouched, only what sits in them changes
          <div className="card" id={`card${i + 1}`} key={artwork.id}>
            <ArtworkCard {...artwork} />
          </div>
        ))}
      </div>

      <svg
        className="navArrow left"
        ref={arrowLeftRef}
        viewBox="0 0 34 44"
        role="button"
        tabIndex={0}
        aria-label="Previous artworks"
        onClick={() => changePage(-1)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            changePage(-1);
          }
        }}
      >
        <path d="M 24 6 L 8 22 L 24 38" />
      </svg>
      <svg
        className="navArrow right"
        ref={arrowRightRef}
        viewBox="0 0 34 44"
        role="button"
        tabIndex={0}
        aria-label="Next artworks"
        onClick={() => changePage(1)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            changePage(1);
          }
        }}
      >
        <path d="M 10 6 L 26 22 L 10 38" />
      </svg>

      <div id="coreWrap" ref={coreWrapRef}>
        <div id="core" ref={coreRef}></div>
      </div>

      <footer>
        <h2>Made with ❤️ by DVM</h2>
      </footer>
    </div>
  );
}