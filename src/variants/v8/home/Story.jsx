// Year by year: the swarm → paper → origami timeline handoff from V3's home
// (src/variants/v3/home/Home.jsx), as one pinned stage. The DVM mark the swarm formed in Legacy
// has already glided onto the spot where the folded paper mark of the FoldTimeline sits (the
// shared layer in LegacyStory.jsx), so the stage pins with the dots on the paper's spot and the
// copy beside them. Then, all mapped to scroll (both directions):
//   SETTLE  the paper fades in over the dots as they fade out, and the copy leaves in step
//   strip   the strip unfolds and pans through every year, latest first. Once it is flat it rises
//           to the upper third, and the year under the camera gets the stage: its entry list
//           hangs from the strip (the kit's caption), its dossier (YearPanel) hangs beside the
//           list on a thread from the same stop, and a rail at the top shows where the reader is
//           in the years. The other years' lists stay hidden, the strip's ends fade off, and the
//           strip's cast shadow is masked away below it (it reads as dark slabs on this page).
//   OUT     the strip fades out while the archive's line draws over it (ArchiveEnd's track is
//           pulled up under this stretch by this track's negative bottom margin), so the line
//           starts as the timeline finishes, with no empty scroll between them
// The timeline's WebGL context mounts as the stage approaches and goes once the stage is behind
// the reader; its first frame has to be on screen before the dots hand over to it.
// Phones, reduced motion and no WebGL2 (or a renderer that fails): no swarm, the kit's vertical
// paper strip in the page flow.
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FoldTimeline } from "../../../immersive/kit/timeline";
import { makePhases, stopProgress } from "../../../immersive/kit/timeline/lib/phases";
import GLBoundary from "../chrome/GLBoundary";
import { hasWebGL2 } from "../lib/gl";
import { useMedia, useReducedMotion } from "../lib/hooks";
import { clamp01, lerp, smooth } from "../lib/math";
import { P } from "../lib/paths";
import { scheduleRefresh } from "../lib/refresh";
import { YEARS_LATEST_FIRST, toFoldStops } from "./storyData";
import { SwarmChainContext } from "./swarmChain";
import YearPanel from "./YearPanel";
import ui from "../ui.module.css";
import s from "./story.module.css";

gsap.registerPlugin(ScrollTrigger);

/* FoldTimeline pacing in the kit's own units (timeline/lib/phases.ts makePhases). */
const TL_PER_STOP = 0.66;
const TL_UNFOLD = 0.9;
/** Viewport heights of page scroll per kit unit: about half a viewport of scroll per year. */
const TL_PACE = 0.76;
/** Entries listed under a year before its "more" toggle (keeps the list clear of the page foot). */
const MAX_ENTRIES = 5;
/** How much of the kit's tail (the rest on the last stop) plays before the handoff. */
const TL_REST = 0.3;

/* The pinned stretches, in viewport heights of scroll. */
const SETTLE = 0.8;
const OUT = 0.3;

/* Within SETTLE (0..1): the paper comes in before the dots go, so the mark is never missing. */
const PAPER_IN = [0.3, 0.85];
const DOTS_OUT = [0.45, 1];
const COPY_OUT = [0.4, 0.9];
/* Over the kit's zoom from the overview to the first year (0..1) the strip rises, so that the strip
   and what hangs from it (the year's list and dossier) sit as one block under the rail, and the
   dossier and the rail come in. The strip at a year, as the kit's camera frames it: centre and
   thickness in fractions of the viewport's height (timeline/scene/PaperStrip.tsx). */
const STRIP_CY = 0.483;
const STRIP_H = 0.167;
/** The rail's foot, the room kept clear at the page's foot, and what hangs under the strip (px). */
const RAIL_FOOT = 132;
const PAGE_FOOT = 64;
const HANG = 330;
function stripLift(vh) {
  const thick = STRIP_H * vh;
  const free = vh - RAIL_FOOT - PAGE_FOOT - thick - HANG;
  const top = RAIL_FOOT + Math.max(28, free / 2);
  return Math.max(0, STRIP_CY * vh - (top + thick / 2));
}
const CARD_IN = [0.55, 1];
/* How far the pan is from resting on a year (0 = on it, 0.5 = halfway to the next): the dossier
   is fully there while the strip rests, and gone by the time it is halfway to the next year. */
const HOLD = [0.24, 0.46];
/* The strip's canvas is masked below the strip (its cast shadow) and at its ends. Bottom of the
   visible band, in fractions of the canvas's height: under the folded mark (only the tip of its
   shadow goes), under the whole strip seen at once (centred; its thickness goes as 1 / aspect,
   the kit fits its length to the width), and under the strip at a year. The band then fades out
   over MASK_SOFT. Measured against the kit's camera (timeline/scene/PaperStrip.tsx). */
const CUT_MARK = 0.84;
const cutOverview = (aspect) => 0.512 + 0.045 / Math.max(0.5, aspect);
const CUT_STRIP = 0.575;
const MASK_SOFT = 0.03;
/** The dossier's gap from its year's entry list, and its width range (px); narrower with no still. */
const CARD_GAP = 40;
const CARD_W = [300, 600];
const CARD_W_TEXT = 400;
/** The swarm lets go a little into the timeline, so a reader scrolling back up meets formed dots. */
const SWARM_DONE_AT = 0.02;
/* Within OUT (0..1). */
const STRIP_OUT = [0, 0.85];
const PANEL_OUT = [0, 0.4];

const pad2 = (n) => String(n).padStart(2, "0");
/** Frames after the timeline's renderer exists before the dots hand over to it (its first
 *  frame, with the shader compile, has drawn by then). */
const READY_FRAMES = 4;

const LEDE = "Every year of DVM: the fests, what shipped, who joined.";

/** Scroll lengths (vh) of the stage for `n` stops, and the kit progress the strip stretch ends on. */
function pacing(n) {
  const ph = makePhases(n, true, TL_PER_STOP, TL_UNFOLD);
  const tlEnd = ph.pan[1] + (1 - ph.pan[1]) * TL_REST;
  const tl = tlEnd * ph.total * TL_PACE;
  return { ph, tlEnd, tl, total: SETTLE + tl + OUT };
}

const preloadTimeline = () => import("../../../immersive/kit/timeline/scene/TimelineCanvas").catch(() => {});

/**
 * @param {{ fallback?: boolean, onGLFail?: () => void }} props
 *   fallback: render the page-flow strip (the timeline's renderer failed before).
 *   onGLFail: called when the pinned timeline's renderer fails (LegacyStory drops the chain).
 */
export default function Story({ fallback = false, onGLFail }) {
  const narrow = useMedia("(max-width: 759px)");
  const reduced = useReducedMotion();
  const [gl] = useState(hasWebGL2);
  const [failed, setFailed] = useState(false);
  const flow = narrow || reduced || !gl || fallback || failed;
  const stops = useMemo(() => toFoldStops(YEARS_LATEST_FIRST, P), []);
  const pace = useMemo(() => pacing(stops.length), [stops.length]);

  // the swarm shared with Legacy (desktop home); without it the paper simply fades in
  const chain = useContext(SwarmChainContext);
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const tlLayer = useRef(null);
  const copyRef = useRef(null);
  const panelRef = useRef(null);
  const railRef = useRef(null);
  /** Scroll-side state the frame loop composes with the strip's own (smoothed) progress. */
  const scrollRef = useRef({ tlp: 0, out: 0 });
  const tl = useRef(null);
  const stRef = useRef(null);
  const lastP = useRef(0);
  const replay = useRef(() => {});
  const readyRef = useRef(false);
  const [mountTimeline, setMountTimeline] = useState(false);
  const [active, setActive] = useState(0);
  const onActive = useCallback((i) => setActive(i), []);
  const onFail = useCallback(() => {
    setFailed(true);
    onGLFail?.();
  }, [onGLFail]);

  useLayoutEffect(() => {
    if (flow) return;
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    const { tlEnd, tl: TL, total } = pace;

    const apply = (p) => {
      lastP.current = p;
      const u = p * total; // viewport heights into the pin
      const settle = clamp01(u / SETTLE);
      const tlp = clamp01((u - SETTLE) / TL) * tlEnd;
      const out = clamp01((u - SETTLE - TL) / OUT);
      const ready = readyRef.current;

      // the dots hold until the paper's first frame is on screen; past SETTLE they are gone
      if (chain?.fade.current) {
        const dots = settle >= 1 ? 0 : ready ? 1 - smooth(DOTS_OUT[0], DOTS_OUT[1], settle) : 1;
        chain.fade.current.style.opacity = dots.toFixed(3);
      }
      chain?.set("storyDone", settle >= 1 && tlp > SWARM_DONE_AT);

      const paper = ready ? smooth(PAPER_IN[0], PAPER_IN[1], settle) * (1 - smooth(STRIP_OUT[0], STRIP_OUT[1], out)) : 0;
      const layer = tlLayer.current;
      if (layer) {
        layer.style.opacity = paper.toFixed(3);
        layer.style.pointerEvents = paper > 0.6 ? "auto" : "none";
      }
      tl.current?.setProgress(tlp);
      scrollRef.current.tlp = tlp;
      scrollRef.current.out = out;

      if (copyRef.current) copyRef.current.style.opacity = (1 - smooth(COPY_OUT[0], COPY_OUT[1], settle)).toFixed(3);
    };
    replay.current = () => apply(lastP.current);

    const ctx = gsap.context(() => {
      stRef.current = ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        pin: stage,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });
      // the timeline's context: from the stage rising into view (the mark is still gliding)
      // until well after the stage has unpinned with the strip faded out
      ScrollTrigger.create({
        trigger: wrap,
        start: "top bottom",
        end: "bottom 40%",
        onToggle: (self) => setMountTimeline(self.isActive),
        onRefresh: (self) => setMountTimeline(self.isActive),
      });
    }, wrap);
    const cancelRefresh = scheduleRefresh();
    return () => {
      cancelRefresh();
      ctx.revert();
      stRef.current = null;
      replay.current = () => {};
    };
  }, [flow, pace, chain]);

  // fetch the timeline's renderer early, so mounting it is not a download
  useEffect(() => {
    if (flow) return;
    const idle = "requestIdleCallback" in window;
    const id = idle ? window.requestIdleCallback(preloadTimeline, { timeout: 4000 }) : window.setTimeout(preloadTimeline, 1200);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [flow]);

  // a fresh timeline gets the progress the reader is at, then joins in once it has drawn
  useLayoutEffect(() => {
    readyRef.current = false;
    replay.current();
    if (!mountTimeline) return;
    let raf = 0;
    let frames = 0;
    const tick = () => {
      // three.js tags its canvas once the renderer exists; count frames from there
      if (tlLayer.current?.querySelector("canvas[data-engine]")) frames += 1;
      if (frames >= READY_FRAMES) {
        readyRef.current = true;
        replay.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mountTimeline]);

  // Every frame while the strip exists, from the strip's own progress (it eases after the
  // scroll, so everything placed against it stays on it): the strip's rise and canvas mask, the
  // year's dossier hung beside its entry list, and the rail.
  useEffect(() => {
    if (flow || !mountTimeline) return;
    const { ph } = pace;
    const n = ph.count;
    // what was last written (Infinity: nothing yet, so the first frame writes everything)
    const last = { lift: Infinity, cut: Infinity, po: Infinity, x: Infinity, y: Infinity, w: Infinity, reach: Infinity, ro: Infinity, rp: Infinity, ri: -1 };
    let holdLeft = NaN;
    let gutter = 64;
    const measure = () => {
      gutter = parseFloat(getComputedStyle(panelRef.current ?? document.documentElement).getPropertyValue("--gutter")) || 64;
      holdLeft = NaN;
    };
    measure();
    window.addEventListener("resize", measure);
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const layer = tlLayer.current;
      const panel = panelRef.current;
      const rail = railRef.current;
      if (!layer || !panel || !rail) return;
      const { tlp, out } = scrollRef.current;
      const kp = readyRef.current && tl.current ? tl.current.getProgress() : tlp;
      const a = smooth(ph.unfold[0], ph.unfold[1], kp);
      const b = smooth(ph.zoom[0], ph.zoom[1], kp);
      const vh = window.innerHeight;
      const vw = document.documentElement.clientWidth;

      // the flat strip rises to the upper third; the canvas below it is masked (cast shadow)
      const lift = -stripLift(vh) * b;
      if (Math.abs(lift - last.lift) > 0.2) {
        last.lift = lift;
        layer.style.transform = `translate3d(0, ${lift.toFixed(1)}px, 0)`;
      }
      const cut = lerp(lerp(CUT_MARK, cutOverview(vw / vh), smooth(0.5, 1, a)), CUT_STRIP, b);
      if (Math.abs(cut - last.cut) > 0.0005) {
        last.cut = cut;
        layer.style.setProperty("--cut", `${(cut * 100).toFixed(2)}%`);
        layer.style.setProperty("--cut-end", `${((cut + MASK_SOFT) * 100).toFixed(2)}%`);
      }

      // where the pan is among the years (the kit's active year is the nearest one)
      const t = clamp01((kp - ph.pan[0]) / Math.max(1e-6, ph.pan[1] - ph.pan[0])) * Math.max(0, n - 1);
      const i = Math.min(n - 1, Math.round(t));
      const rest = 1 - smooth(HOLD[0], HOLD[1], Math.abs(t - i));
      const show = smooth(CARD_IN[0], CARD_IN[1], b) * (1 - smooth(PANEL_OUT[0], PANEL_OUT[1], out));

      // the rail: in with the dossier, out with the strip
      if (Math.abs(show - last.ro) > 0.002) {
        last.ro = show;
        rail.style.opacity = show.toFixed(3);
        rail.inert = show < 0.5;
      }
      const rp = n > 1 ? t / (n - 1) : 0;
      if (Math.abs(rp - last.rp) > 0.0005) {
        last.rp = rp;
        rail.style.setProperty("--p", rp.toFixed(4));
      }
      if (i !== last.ri) {
        last.ri = i;
        rail.querySelectorAll("li").forEach((li, k) => li.toggleAttribute("data-active", k === i));
        const count = rail.querySelector("[data-count]");
        if (count) count.textContent = `${pad2(i + 1)} / ${pad2(n)}`;
      }

      // the dossier: hung beside the active year's list, on a thread from the year's stop
      const po = show * rest;
      if (Math.abs(po - last.po) > 0.002) {
        last.po = po;
        panel.style.opacity = po.toFixed(3);
        panel.style.pointerEvents = po > 0.6 ? "auto" : "none";
        // out of the tab order (and the accessibility tree) while it is not showing
        panel.inert = po < 0.5;
      }
      if (po <= 0.001) return;
      const cap = layer.querySelector("ol")?.children[i];
      if (!cap) return;
      const r = cap.getBoundingClientRect();
      const x = r.right + CARD_GAP;
      // its width is set where the year rests, so the card keeps its size as the strip glides
      if (Math.abs(t - i) < 0.02 || Number.isNaN(holdLeft)) holdLeft = x;
      const max = YEARS_LATEST_FIRST[i]?.image ? CARD_W[1] : CARD_W_TEXT;
      const w = Math.round(Math.max(CARD_W[0], Math.min(max, vw - gutter - holdLeft)));
      // the thread runs from the stop's dot (the caption's left edge) to the card
      const y = r.top + 26;
      const reach = x - r.left;
      if (Math.abs(x - last.x) > 0.2 || Math.abs(y - last.y) > 0.2) {
        last.x = x;
        last.y = y;
        panel.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        panel.style.setProperty("--card-max-h", `${Math.max(160, vh - y - 28).toFixed(0)}px`);
      }
      if (w !== last.w) {
        last.w = w;
        panel.style.width = `${w}px`;
      }
      if (Math.abs(reach - last.reach) > 0.2) {
        last.reach = reach;
        panel.style.setProperty("--reach", `${reach.toFixed(1)}px`);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [flow, mountTimeline, pace]);

  // the page scroll at which the stage rests on year i
  const scrollForStop = useCallback(
    (i) => {
      const st = stRef.current;
      if (!st) return null;
      const tlp = Math.min(pace.tlEnd, stopProgress(pace.ph, i));
      const u = SETTLE + (tlp / pace.tlEnd) * pace.tl;
      return Math.round(st.start + (u / pace.total) * (st.end - st.start));
    },
    [pace],
  );

  // keyboard: focusing a year on the strip scrolls the page to that year, so the stage shows it
  const onTimelineFocus = useCallback(
    (e) => {
      const list = tlLayer.current?.querySelector("ol");
      if (!list) return;
      const i = [...list.children].findIndex((li) => li.contains(e.target));
      if (i < 0) return;
      const top = scrollForStop(i);
      if (top !== null && Math.abs(window.scrollY - top) > 2) window.scrollTo({ top, behavior: "auto" });
    },
    [scrollForStop],
  );

  // the rail: a year goes to it
  const goToYear = useCallback(
    (i) => {
      const top = scrollForStop(i);
      if (top === null) return;
      const smoothOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: smoothOk ? "smooth" : "auto" });
    },
    [scrollForStop],
  );

  if (flow) {
    return (
      <section ref={wrapRef} id="legacy-years" className={`${ui.sec} ${s.flow}`} data-light="50% 40% 34vw" data-chapter="Year by year" aria-labelledby="v8-story-title">
        <div className={`${ui.wrap} ${ui.secHead}`}>
          <h2 id="v8-story-title" className={ui.h2}>
            Year by year
          </h2>
          <p className={ui.lede}>{LEDE}</p>
        </div>
        <FoldTimeline items={stops} tone="teal" layout="vertical" title="DVM, year by year" />
        <p className={`${ui.wrap} ${s.flowLinks}`}>
          <Link to={P("/alumni")} className={ui.btn}>
            Our alumni
          </Link>
          <Link to={P("/archive")} className={ui.link}>
            Open the archive →
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section
      ref={wrapRef}
      id="legacy-years"
      className={s.track}
      style={{ height: `${((pace.total + 1) * 100).toFixed(1)}vh`, marginBottom: `${(-(1 + OUT) * 100).toFixed(1)}vh` }}
      data-light="50% 48% 34vw"
      data-chapter="Year by year"
      aria-labelledby="v8-story-title"
    >
      <div ref={stageRef} className={s.stage}>
        {mountTimeline && (
          <div ref={tlLayer} className={`${s.layer} ${s.fade}`} onFocus={onTimelineFocus}>
            <GLBoundary fallback={null} onFail={onFail}>
              {() => (
                <FoldTimeline
                  ref={tl}
                  items={stops}
                  tone="teal"
                  background="transparent"
                  scrollMode="external"
                  layout="horizontal"
                  startFolded
                  foldOnEnter={false}
                  height={TL_PER_STOP}
                  unfoldLength={TL_UNFOLD}
                  maxEntries={MAX_ENTRIES}
                  title="DVM, year by year"
                  onActiveChange={onActive}
                />
              )}
            </GLBoundary>
          </div>
        )}

        <div ref={copyRef} className={s.copy}>
          <h2 id="v8-story-title" className={ui.h2}>
            Year by year
          </h2>
          <p className={ui.lede}>{LEDE}</p>
        </div>

        <nav ref={railRef} className={s.rail} aria-label="Years" inert>
          <span className={s.railLabel}>Year by year</span>
          <ol className={s.railTrack}>
            {YEARS_LATEST_FIRST.map((y, i) => (
              <li key={y.year} style={{ left: `${YEARS_LATEST_FIRST.length > 1 ? (i / (YEARS_LATEST_FIRST.length - 1)) * 100 : 50}%` }}>
                <button type="button" className={s.railYear} onClick={() => goToYear(i)} aria-current={i === active ? "step" : undefined}>
                  {y.label ?? y.year}
                </button>
              </li>
            ))}
          </ol>
          <span className={s.railCount} data-count="" aria-hidden="true">
            {pad2(active + 1)} / {pad2(YEARS_LATEST_FIRST.length)}
          </span>
        </nav>

        <div ref={panelRef} className={s.panelSlot} inert>
          <YearPanel stop={YEARS_LATEST_FIRST[active]} />
        </div>
      </div>
    </section>
  );
}
