// Legacy → Year by year as one passage with one swarm. The DVM mark forms once, behind the alumni
// constellation, and carries on into the year-by-year stage, where it settles into the folded paper and
// the timeline takes over (Story.jsx).
//
// The swarm lives in a viewport-sized sticky layer behind both sections. While Legacy is on
// screen the swarm looks exactly as Legacy's own does (LegacySwarm: the same region of the
// section, fill, dimmed brightness, parallax and sway; a small step dimmer while a company is lit
// in Legacy's constellation): the layer rides in with Legacy, so the canvas's top is the section's top. From the moment Legacy's top
// reaches the top of the viewport the layer holds still, and only as Legacy scrolls away does the
// mark glide onto the folded paper's spot (paperRegion), brighten to full and square up. The
// glide moves the swarm's camera (SwarmController.setView), not the canvas: the particles never
// re-scatter, and the canvas keeps filling the viewport, so neither its edges nor the edge of the
// ambient dust ever come into view. Story then fades the layer as the
// paper fades in (chain.fade) and says when the paper has it (chain storyDone), at which point
// the WebGL field is unmounted.
//
// Phones, reduced motion and no WebGL2: Story is the vertical strip in the page flow, so there is
// nothing to carry the mark into; Legacy keeps its own swarm (LegacySwarm) as on the /legacy page.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SwarmField } from "../../../immersive/kit/swarm";
import { LOGO_ASPECT } from "../../../immersive/shared/logo";
import { hasWebGL2 } from "../lib/gl";
import { useMedia, useReducedMotion } from "../lib/hooks";
import { lerp, smooth } from "../lib/math";
import Legacy from "../legacy/Legacy";
import Story from "./Story";
import {
  LEGACY_BRIGHTNESS,
  LEGACY_ACTIVE,
  LEGACY_FILL,
  LEGACY_PARALLAX,
  SwarmChainContext,
  createSwarmChain,
  markRect,
  paperRegion,
  useChainValue,
} from "./swarmChain";
import s from "./chain.module.css";

gsap.registerPlugin(ScrollTrigger);

/* Over Legacy scrolling out of the top of the viewport (glide progress 0..1): */
/** Legacy lets go of the swarm: its selection clears (the mark back at idle) just before the glide. */
const RELEASE_AT = 0.08;
/** The mark travels from behind the graph to the paper's spot. */
const GLIDE = [0.1, 0.95];
/** …and brightens from Legacy's dim to full. */
const BRIGHTEN = [0.2, 0.9];
/** …and stops swaying, squared up to the paper, with a calmer parallax. */
const SQUARE_AT = 0.5;
const PAPER_PARALLAX = 0.12;
/** Brightness changes go to the swarm in steps (the engine eases between them). */
const BRIGHT_STEP = 0.05;
/** The glide's brightening (0..1) is kept in state at this resolution. */
const LIFT_STEP = 0.02;
/* While the passage's top comes up the viewport: the soft band the dust fades in over at the
   canvas's top edge, as a fraction of the distance to the viewport's top, at most this much of
   the viewport's height. */
const EDGE_K = 0.6;
const EDGE_MAX = 0.24;

export default function LegacyStory() {
  const narrow = useMedia("(max-width: 759px)");
  const reduced = useReducedMotion();
  const [gl] = useState(hasWebGL2);
  const [failed, setFailed] = useState(false);
  const [chain] = useState(createSwarmChain);
  const wrapRef = useRef(null);
  const onGLFail = useCallback(() => setFailed(true), []);

  if (narrow || reduced || !gl || failed) {
    return (
      <>
        <Legacy />
        <Story fallback={failed} />
      </>
    );
  }

  return (
    <div ref={wrapRef} className={s.chain} data-v8-chain="">
      <ChainSwarm chain={chain} wrapRef={wrapRef} />
      <SwarmChainContext.Provider value={chain}>
        <Legacy />
        <Story onGLFail={onGLFail} />
      </SwarmChainContext.Provider>
    </div>
  );
}

function ChainSwarm({ chain, wrapRef }) {
  const boxRef = useRef(null);
  const squareRef = useRef(false);
  /** The last view the glide asked for, replayed onto a freshly mounted field. */
  const viewRef = useRef(null);
  const [inRange, setInRange] = useState(false);
  const [square, setSquare] = useState(false);
  // how far the glide has brightened the mark from its idle (0) to full (1)
  const [lift, setLift] = useState(0);
  const storyDone = useChainValue(chain, "storyDone");
  // a company is lit in Legacy's constellation: the mark dims a small step (the engine eases it)
  const active = useChainValue(chain, "active");
  const idle = active ? LEGACY_ACTIVE : LEGACY_BRIGHTNESS;
  const brightness = Math.round((idle + (1 - idle) * lift) / BRIGHT_STEP) * BRIGHT_STEP;
  // The field exists from just before Legacy comes into view until the paper has the mark.
  const live = inRange && !storyDone;

  useLayoutEffect(() => {
    const box = boxRef.current;
    // (this child's layout effect runs before the parent's ref is attached: reach the passage
    // through the DOM, or the triggers below are never created and the swarm never mounts)
    const wrap = wrapRef.current ?? box?.closest("[data-v8-chain]");
    if (!wrap || !box) return;
    const legacy = wrap.querySelector("#legacy");
    const story = wrap.querySelector("#legacy-years");
    // Legacy's height (Story's offset in the passage): the scroll over which Legacy leaves
    const glideLen = () => Math.max(1, story ? story.offsetTop : wrap.offsetHeight / 2);

    // the formed mark behind the graph and on the paper, in the canvas's px (the canvas is the
    // viewport-sized sticky box)
    let from = null;
    let to = null;
    const measure = () => {
      const w = box.clientWidth || window.innerWidth;
      const h = box.clientHeight || window.innerHeight;
      const lh = legacy ? legacy.offsetHeight : h;
      const changed = Math.abs(lh - chain.geo.legacyH) > 1;
      chain.geo.legacyH = lh;
      from = markRect(chain.place(w, h), LEGACY_FILL, LOGO_ASPECT, w, h);
      to = markRect(paperRegion(w, h), 1, LOGO_ASPECT, w, h);
      return changed;
    };

    const apply = (q) => {
      if (!from || !to) measure();
      const e = smooth(GLIDE[0], GLIDE[1], q);
      // scale about the canvas's origin, so the legacy mark's centre lands on the paper's. The
      // swarm moves its camera to do it (setView): the canvas itself never moves, so its edges
      // (and the edge of the dust) never come into view.
      const k = lerp(1, to.h / Math.max(1, from.h), e);
      const view = e > 0 ? { x: lerp(from.cx, to.cx, e) - k * from.cx, y: lerp(from.cy, to.cy, e) - k * from.cy, scale: k } : null;
      viewRef.current = view;
      chain.swarm.current?.setView(view);
      setLift(Math.round(smooth(BRIGHTEN[0], BRIGHTEN[1], q) / LIFT_STEP) * LIFT_STEP);
      squareRef.current = q > SQUARE_AT;
      setSquare(squareRef.current);
      chain.set("legacyOwns", q < RELEASE_AT);
    };

    // While Legacy rides in, the canvas's top is the section's top: fade the dust in over a band
    // there instead of a hard line. The band shrinks to nothing as the box reaches the viewport's
    // top (where the canvas's edge is the viewport's own).
    const edge = (p) => {
      const t = (1 - p) * (box.clientHeight || window.innerHeight);
      box.style.setProperty("--edge", `${Math.min(t * EDGE_K, EDGE_MAX * window.innerHeight).toFixed(1)}px`);
    };

    let off = 0;
    const range = (active) => {
      window.clearTimeout(off);
      if (active) setInRange(true);
      else off = window.setTimeout(() => setInRange(false), 300);
    };

    const ctx = gsap.context(() => {
      // mount: from half a viewport before the passage arrives until it has scrolled past
      ScrollTrigger.create({
        trigger: wrap,
        start: "top 150%",
        end: "bottom top",
        onToggle: (self) => range(self.isActive),
        onRefresh: (self) => range(self.isActive),
      });
      // the passage's top coming up the viewport
      ScrollTrigger.create({
        trigger: wrap,
        start: "top bottom",
        end: "top top",
        onUpdate: (self) => edge(self.progress),
        onRefresh: (self) => edge(self.progress),
      });
      // the glide, over Legacy scrolling out of the top of the viewport
      ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: () => `+=${glideLen()}`,
        invalidateOnRefresh: true,
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => {
          // Legacy changed height without the canvas resizing: re-fit the mark to the section
          if (measure()) void chain.swarm.current?.setTarget("logo", { placement: chain.place, fill: LEGACY_FILL, sway: squareRef.current ? 0 : undefined });
          apply(self.progress);
        },
      });
    }, wrap);
    return () => {
      window.clearTimeout(off);
      ctx.revert();
    };
  }, [chain, wrapRef]);

  // a fresh field: give it the glide's current view
  useEffect(() => {
    if (!live) return;
    chain.swarm.current?.setView(viewRef.current);
    chain.set("gen", chain.get("gen") + 1);
  }, [live, chain]);

  return (
    <div className={s.layer} aria-hidden="true">
      <div ref={boxRef} className={s.sticky}>
        <div ref={chain.fade} className={s.fade}>
          {live && (
            <SwarmField
              ref={chain.swarm}
              target="logo"
              placement={chain.place}
              fill={LEGACY_FILL}
              sway={square ? 0 : undefined}
              brightness={brightness}
              parallax={square ? PAPER_PARALLAX : LEGACY_PARALLAX}
              background="transparent"
              holdToAttract={false}
              // the cursor never moves the dots: the mark sits beside the constellation, not under it
              ignoreCursor
              cursorRing={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
