import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AsciiLogo } from "../../../immersive/kit/ascii";
import { MercuryLogo, paintHeroBackdrop } from "../../../immersive/kit/mercury";
import { SwarmField } from "../../../immersive/kit/swarm";
import { FoldTimeline, buildMilestoneStops } from "../../../immersive/kit/timeline";
import { site, verticals, fests, stats, socials } from "../../../immersive/data";
import { LOGO_PATHS } from "../../../immersive/shared/logo";
import bg3 from "../../../assests/bg_3.png";
import letters from "../../../assests/image.png";
import V3Nav from "../shell/V3Nav";
import { useBoot } from "../shell/context";
import ArchiveTeaser from "./ArchiveTeaser";
import {
  LOGO_VIEWBOX,
  clamp01,
  heroPadding,
  mercuryMarkRect,
  scaleRect,
  smooth,
  toRegion,
  useMedia,
} from "./geometry";
import s from "./home.module.css";

/* ------------------------------------------------------------------ content */

const TEAM_GLYPH = { frontend: "FRONT\nEND", app: "APP\nDEV", backend: "BACK\nEND", video: "VIDEO", design: "DESIGN" };
const FEST_ORDER = ["BOSM", "Oasis", "APOGEE"];
const FEST_LIST = FEST_ORDER.map((id) => fests.find((f) => f.id === id)).filter(Boolean);
const firstSentence = (t) => (t.match(/^.*?[.!?](\s|$)/)?.[0] ?? t).trim();
const STAT_IDS = [0, 1, 2, 3, 4, 5];
const STATS = STAT_IDS.map((i) => stats[i]).filter(Boolean);

const MEDIUMS = [
  { id: "ascii", label: "ASCII" },
  { id: "mercury", label: "Mercury" },
  { id: "swarm", label: "Swarm" },
  { id: "paper", label: "Paper" },
  { id: "archive", label: "Archive" },
];

/* Timeline pacing (FoldTimeline phases, in viewport heights). */
const TL_PER_STOP = 0.6;
const TL_UNFOLD = 1.4;
function timelineLength(n) {
  const hold = 0.15;
  const zoom = 0.7;
  const pan = Math.max(1, n - 1) * TL_PER_STOP;
  const tail = Math.max(0.35, TL_PER_STOP * 0.55);
  return hold + TL_UNFOLD + zoom + pan + tail;
}

/* Where the folded paper mark sits in a full-viewport FoldTimeline (no intro), measured. */
function paperRect(w, h) {
  const mh = h * 0.6;
  const mw = mh * 0.77;
  return { x: w * 0.497 - mw / 2, y: h * 0.478 - mh / 2, w: mw, h: mh };
}

/* ------------------------------------------------------------------ the story */

export default function Home() {
  const boot = useBoot();
  const bootShown = useRef(boot === "booting");
  const location = useLocation();
  const narrow = useMedia("(max-width: 759px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const flowTimeline = narrow || reduced; // vertical paper strip in the page flow

  const milestones = useMemo(() => buildMilestoneStops(), []);
  const tlLength = timelineLength(milestones.length);

  // intro: wait (boot overlay up) → ascii (mark printed in glyphs) → resolve (scan into mercury) → done
  const [intro, setIntro] = useState("wait");
  const [mount, setMount] = useState({ mercury: true, swarm: false, timeline: false, archive: false });
  const [medium, setMedium] = useState(0);

  const stageRef = useRef(null);
  const textureRef = useRef(null);
  const lettersRef = useRef(null);
  const washRef = useRef(null);
  const asciiLayer = useRef(null);
  const mercLayer = useRef(null);
  const scanRef = useRef(null);
  const swarmLayer = useRef(null);
  const tlLayer = useRef(null);
  const bridgeRef = useRef(null);
  const archLayer = useRef(null);
  const heroTextRef = useRef(null);
  const railFill = useRef(null);
  const merc = useRef(null);
  const swarm = useRef(null);
  const tl = useRef(null);

  // what the glass refracts: the stage's own texture / grid / letters, repainted as the mask moves
  const [backdrop, setBackdrop] = useState(null);
  const bd = useRef({ canvas: null, texture: null, letters: null, last: 0 });
  useEffect(() => {
    let alive = true;
    const load = (src) => new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    Promise.all([load(bg3), load(letters)])
      .then(([t, l]) => {
        if (!alive) return;
        const b = bd.current;
        b.canvas = document.createElement("canvas");
        b.texture = t;
        b.letters = l;
        paintHeroBackdrop(b.canvas, { width: window.innerWidth, height: window.innerHeight, texture: t, letters: l });
        setBackdrop({ source: b.canvas, element: stageRef });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const sec = useRef({}); // section elements by key
  const reg = (key) => (el) => void (el ? (sec.current[key] = el) : delete sec.current[key]);

  const state = useRef({
    vw: 1440,
    vh: 900,
    tops: {},
    heights: {},
    steps: [],
    stepKey: "",
    wipe: 0, // 0..1 scan progress of the ascii → mercury resolve
    introPhase: "wait",
    mount: { mercury: true, swarm: false, timeline: false, archive: false },
    mercP: -1,
    medium: 0,
    raf: 0,
    dirty: true,
  });
  state.current.introPhase = intro;

  /* ---------- layout: section tops, rects, formations ---------- */

  const measure = useCallback(() => {
    const st = state.current;
    st.vw = window.innerWidth;
    st.vh = window.innerHeight;
    const y = window.scrollY;
    for (const [k, el] of Object.entries(sec.current)) {
      const r = el.getBoundingClientRect();
      st.tops[k] = r.top + y;
      st.heights[k] = r.height;
    }
    const { vw, vh } = st;
    const hero = mercuryMarkRect(vw, vh, heroPadding(vw));
    st.heroRect = hero;
    st.paperRect = paperRect(vw, vh);
    const side = narrow ? { x0: 0.06, y0: 0.09, x1: 0.94, y1: 0.4 } : { x0: 0.48, y0: 0.18, x1: 0.88, y1: 0.82 };
    const heroOpts = { placement: toRegion(scaleRect(hero, 0.96, 0.01), vw, vh), fill: 1, sway: 0, spin: 0, tilt: 0, morphDuration: 0.9 };
    const paperOpts = flowTimeline
      ? { placement: narrow ? { x0: 0.2, y0: 0.1, x1: 0.8, y1: 0.46 } : toRegion(hero, vw, vh), fill: 1, sway: 0, morphDuration: 1.6 }
      : { placement: toRegion(st.paperRect, vw, vh), fill: 1, sway: 0, spin: 0, tilt: 0, morphDuration: 1.6, kick: 0.3 };
    const T = st.tops, H = st.heights;
    const mid = vh * 0.5;
    const steps = [{ key: "hero", at: -Infinity, target: "logo", opts: heroOpts }];
    if (T.shatter != null) steps.push({ key: "about", at: T.shatter + H.shatter * 0.45, target: { text: "WE ARE\nDVM" }, opts: { placement: side, burst: 1.4, kick: 0.9, morphDuration: 1.6 } });
    verticals.forEach((v, i) => {
      if (T[`team${i}`] != null) steps.push({ key: `team${i}`, at: T[`team${i}`] - mid, target: { text: TEAM_GLYPH[v.id] ?? v.label.toUpperCase() }, opts: { placement: side, morphDuration: 1.2 } });
    });
    if (T.stats != null) steps.push({ key: "stats", at: T.stats - mid, target: { text: "5000+" }, opts: { placement: side, morphDuration: 1.2 } });
    FEST_LIST.forEach((f, i) => {
      if (T[`fest${i}`] != null) steps.push({ key: `fest${i}`, at: T[`fest${i}`] - mid, target: { text: f.name.toUpperCase() }, opts: { placement: side, morphDuration: 1.2 } });
    });
    if (T.settle != null) steps.push({ key: "paper", at: T.settle - mid, target: "logo", opts: paperOpts });
    st.steps = steps;
    st.stepKey = ""; // re-apply
    st.dirty = true;
  }, [narrow, flowTimeline]);

  /* ---------- per-frame choreography ---------- */

  const applyStep = useCallback((force) => {
    const st = state.current;
    const y = window.scrollY;
    let step = st.steps[0];
    for (const sp of st.steps) if (y >= sp.at) step = sp;
    if (!step) return;
    if (!force && step.key === st.stepKey) return;
    const prev = st.stepKey;
    st.stepKey = step.key;
    const c = swarm.current;
    if (!c) return;
    if (prev === "hero" && step.key === "about") c.explode(reduced ? 0 : 2.4);
    void c.setTarget(step.target, step.opts);
  }, [reduced]);

  const update = useCallback(() => {
    const st = state.current;
    const { vw, vh, tops: T, heights: H } = st;
    if (T.hero == null) return;
    const y = window.scrollY;
    const set = (ref, v) => ref.current && (ref.current.style.opacity = v.toFixed(3));

    // hero → shatter
    const heroT = clamp01(y / vh);
    const shat = clamp01((y - T.shatter) / Math.max(1, H.shatter));
    const introDone = st.introPhase === "done";

    // mercury: chrome → glass across the hero, glass → x-ray while it shatters
    const mp = heroT * 1.0 + smooth(0, 0.5, shat) * 0.8;
    if (merc.current && Math.abs(mp - st.mercP) > 0.002) {
      merc.current.setProgress(mp);
      st.mercP = mp;
    }
    const mercOpacity = 1 - smooth(0.05, 0.5, shat);
    set(mercLayer, mercOpacity);

    // backdrop: the redesign's moving texture bubble and outlined letters
    const g = clamp01(y / Math.max(1, document.documentElement.scrollHeight - vh));
    if (textureRef.current) {
      const cx = vw * (0.6 - 0.35 * Math.sin(g * 7.0)) + -heroT * vw * 0.25;
      const cy = vh * (0.2 + 0.55 * Math.abs(Math.sin(g * 4.5 + heroT * 0.6)));
      const m = `radial-gradient(circle 40vw at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = m;
      textureRef.current.style.maskImage = m;
      // glass phase: repaint what the metal refracts (~12 fps is plenty, it is frosted)
      const b = bd.current;
      const now = performance.now();
      if (b.canvas && merc.current && heroT > 0.2 && shat < 0.6 && now - b.last > 80) {
        b.last = now;
        paintHeroBackdrop(b.canvas, { width: vw, height: vh, texture: b.texture, letters: heroT < 0.6 ? b.letters : null, mask: { x: cx, y: cy, r: vw * 0.4 } });
        merc.current.refreshBackdrop();
      }
    }
    set(lettersRef, 1 - smooth(0.15, 0.85, heroT));
    if (washRef.current) washRef.current.style.transform = `translate3d(${(-heroT * vw * 0.6).toFixed(0)}px, ${(heroT * vh * 0.5).toFixed(0)}px, 0)`;
    if (heroTextRef.current) {
      heroTextRef.current.style.opacity = (1 - smooth(0.05, 0.6, heroT)).toFixed(3);
    }

    // swarm: fades in on the mercury mark, carries the middle of the story, then settles on the paper
    const settle = T.settle != null ? clamp01((y - T.settle) / Math.max(1, H.settle)) : 0;
    let swarmO = smooth(0.02, 0.4, shat);
    if (flowTimeline) {
      const leg = clamp01((y - T.legacy + vh * 0.6) / vh);
      swarmO *= 1 - smooth(0.2, 0.9, leg);
    } else swarmO *= 1 - smooth(0.62, 0.95, settle);
    set(swarmLayer, swarmO);

    // paper timeline (desktop): fades in over the settled swarm, unfolds through the legacy track
    const arch = T.archive != null ? clamp01((y - T.archive) / (vh * 0.7)) : 0;
    if (!flowTimeline) {
      const tlIn = smooth(0.45, 0.85, settle);
      const tlO = tlIn * (1 - smooth(0.05, 0.5, arch));
      set(tlLayer, tlO);
      if (tlLayer.current) tlLayer.current.style.pointerEvents = tlO > 0.6 ? "auto" : "none";
      const lp = clamp01((y - T.legacy) / Math.max(1, H.legacy - vh * 0.15));
      tl.current?.setProgress(lp);
    }

    // bridge glyph: the outlined mark draws itself where the archive wall's centre will be
    if (bridgeRef.current) {
      const draw = smooth(0.0, 0.4, arch);
      bridgeRef.current.style.opacity = (smooth(0.0, 0.12, arch) * (1 - smooth(0.7, 1, arch))).toFixed(3);
      bridgeRef.current.style.setProperty("--draw", (1 - draw).toFixed(3));
    }
    const archO = smooth(0.3, 0.85, arch);
    set(archLayer, archO);
    // the closing links scroll up over the stage: lift the teaser's copy so it stays above them
    if (archLayer.current && T.end != null) {
      const lift = Math.min(vh * 0.5, Math.max(0, vh - (T.end - y)));
      archLayer.current.style.setProperty("--lift", `${lift.toFixed(0)}px`);
    }
    if (archLayer.current) archLayer.current.style.pointerEvents = archO > 0.6 ? "auto" : "none";

    // which medium holds the mark right now
    let med = introDone ? 1 : 0;
    if (shat > 0.45) med = 2;
    if (T.settle != null && y > T.settle + H.settle * (flowTimeline ? 0.2 : 0.6)) med = 3;
    if (arch > 0.45) med = 4;
    if (med !== st.medium) {
      st.medium = med;
      setMedium(med);
    }
    if (railFill.current) railFill.current.style.transform = `scaleY(${g.toFixed(4)})`;

    // keep at most two heavy WebGL contexts alive
    const want = {
      mercury: y < T.shatter + H.shatter + vh * 0.3,
      swarm: y > vh * 0.2 && (flowTimeline ? y < T.legacy + vh * 0.6 : y < T.legacy + vh * 0.4),
      timeline: !flowTimeline && y > T.settle - vh * 0.9 && y < T.archive + vh * 0.75,
      archive: y > T.archive - vh * 0.9,
    };
    const m = st.mount;
    if (want.mercury !== m.mercury || want.swarm !== m.swarm || want.timeline !== m.timeline || want.archive !== m.archive) {
      st.mount = want;
      setMount(want);
    }

    applyStep(false);
  }, [applyStep, flowTimeline]);

  // scroll / resize loop
  useEffect(() => {
    const st = state.current;
    const tick = () => {
      st.raf = 0;
      update();
    };
    const kick = () => {
      if (!st.raf) st.raf = requestAnimationFrame(tick);
    };
    const remeasure = () => {
      measure();
      kick();
    };
    measure();
    update();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", remeasure);
    const ro = new ResizeObserver(remeasure);
    if (sec.current.track) ro.observe(sec.current.track);
    document.fonts?.ready.then(remeasure);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", remeasure);
      ro.disconnect();
      cancelAnimationFrame(st.raf);
    };
  }, [measure, update]);

  // a freshly mounted layer gets its opacity before paint; a fresh swarm gets its formation
  useLayoutEffect(() => {
    update();
  }, [mount, update]);
  useEffect(() => {
    if (!mount.swarm) return;
    const id = requestAnimationFrame(() => {
      const st = state.current;
      applyStep(true);
      const targets = st.steps.map((sp) => sp.target);
      void swarm.current?.preload(targets);
    });
    return () => cancelAnimationFrame(id);
  }, [mount.swarm, applyStep]);
  // the rail and layers follow the intro too, not only the scroll
  useEffect(() => {
    update();
  }, [intro, update]);

  /* ---------- intro: ascii resolves into mercury ---------- */

  useEffect(() => {
    if (boot !== "done" || intro !== "wait") return;
    setIntro("ascii");
  }, [boot, intro]);

  useEffect(() => {
    if (intro !== "ascii") return;
    const id = setTimeout(() => setIntro("resolve"), reduced ? 500 : 1500);
    return () => clearTimeout(id);
  }, [intro, reduced]);

  useEffect(() => {
    if (intro !== "resolve") return;
    const st = state.current;
    const dur = reduced ? 350 : 1700;
    const t0 = performance.now();
    merc.current?.ripple?.(0.6);
    let raf = 0;
    const step = (now) => {
      const t = clamp01((now - t0) / dur);
      st.wipe = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      paintWipe();
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        merc.current?.drop?.();
        setIntro("done");
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [intro, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  // the wipe line runs down the mark's rect: glyphs above it are gone, metal below it is not there yet
  const paintWipe = () => {
    const st = state.current;
    const r = st.heroRect ?? mercuryMarkRect(window.innerWidth, window.innerHeight);
    const pad = r.h * 0.12;
    const yLine = r.y - pad + st.wipe * (r.h + pad * 2);
    const soft = Math.max(18, r.h * 0.06);
    const phase = st.introPhase;
    const a = asciiLayer.current, m = mercLayer.current, line = scanRef.current;
    if (m) {
      const mm = phase === "done" ? "none" : `linear-gradient(to bottom, #000 ${(yLine - soft).toFixed(0)}px, transparent ${(yLine + soft).toFixed(0)}px)`;
      m.style.webkitMaskImage = mm;
      m.style.maskImage = mm;
    }
    if (a) {
      const am = `linear-gradient(to bottom, transparent ${(yLine - soft).toFixed(0)}px, #000 ${(yLine + soft).toFixed(0)}px)`;
      a.style.webkitMaskImage = am;
      a.style.maskImage = am;
    }
    if (line) {
      line.style.transform = `translate3d(0, ${yLine.toFixed(1)}px, 0)`;
      line.style.opacity = phase === "resolve" ? String(Math.sin(Math.PI * st.wipe)) : "0";
      line.style.left = `${(r.x - r.w * 0.25).toFixed(0)}px`;
      line.style.width = `${(r.w * 1.5).toFixed(0)}px`;
    }
  };
  useLayoutEffect(() => {
    if (intro === "wait" || intro === "ascii") state.current.wipe = 0;
    paintWipe();
  }); // every render: keeps masks right across intro phase changes and layer remounts

  const replayIntro = () => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    state.current.wipe = 0;
    setIntro("ascii");
  };

  /* ---------- arriving with a section in mind (hamburger: about / legacy) ---------- */

  useEffect(() => {
    const id = location.state?.scrollTo || (location.hash ? location.hash.slice(1) : "");
    if (!id) return;
    const key = id === "legacy" ? "settle" : id === "about" ? "about" : id;
    const t = setTimeout(() => {
      const el = sec.current[key];
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduced ? "auto" : "smooth" });
    }, 120);
    return () => clearTimeout(t);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const jumpTo = (i) => {
    if (i === 0) return replayIntro();
    const key = ["hero", "hero", "about", "settle", "archive"][i];
    const el = sec.current[key];
    if (!el) return;
    const extra = i === 4 ? window.innerHeight * 0.75 : 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + extra, behavior: reduced ? "auto" : "smooth" });
  };

  const showAscii = intro !== "done";
  const heroMark = state.current.heroRect ?? mercuryMarkRect(window.innerWidth, window.innerHeight);

  /* ---------- render ---------- */

  return (
    <div className={s.home} data-intro={intro}>
      <V3Nav />

      {/* ===== the fixed stage: every medium of the mark lives here, at the same screen position ===== */}
      <div className={s.stage} ref={stageRef} aria-hidden={medium < 3 ? "true" : undefined}>
        <div className={s.backdrop} aria-hidden="true">
          <div className={s.grid} />
          <div className={s.texture} ref={textureRef} style={{ backgroundImage: `url(${bg3})` }} />
          <img className={`${s.letters} ${intro !== "wait" ? s.lettersIn : ""}`} ref={lettersRef} src={letters} alt="" draggable={false} />
          <div className={s.wash} ref={washRef} />
        </div>

        {showAscii && (
          <div className={s.layer} ref={asciiLayer} aria-hidden="true">
            <div
              className={`${s.asciiBox} ${intro === "ascii" && bootShown.current ? s.asciiSettle : ""}`}
              style={{ left: heroMark.x - heroMark.w * 0.5, top: heroMark.y - heroMark.h * 0.1, width: heroMark.w * 2, height: heroMark.h * 1.2 }}
            >
              <AsciiLogo
                transparent
                crt={false}
                palette="teal"
                autoRotate={false}
                interactive={false}
                probe={false}
                restPose={{ yaw: -0.08, pitch: 0.13 }}
                reveal="decode"
                revealDuration={1.1}
                scale={0.8}
                quality="high"
              />
            </div>
          </div>
        )}

        {mount.mercury && (
          <div className={s.layer} ref={mercLayer} aria-hidden="true">
            <MercuryLogo
              ref={merc}
              background="transparent"
              env="teal"
              fit={{ padding: heroPadding(narrow ? 390 : 1440) }}
              pointerTarget="window"
              backdrop={backdrop}
              intro={false}
              progressRange={2}
              smoothing={8}
              sway={0.5}
              label="DVM"
            />
          </div>
        )}
        <div className={s.scan} ref={scanRef} aria-hidden="true" />

        {mount.swarm && (
          <div className={`${s.layer} ${s.fadeLayer}`} ref={swarmLayer} aria-hidden="true">
            <SwarmField ref={swarm} background="transparent" palette="teal" parallax={0.12} sway={0} cursorRing={false} />
          </div>
        )}

        {mount.timeline && !flowTimeline && (
          <div className={`${s.layer} ${s.fadeLayer}`} ref={tlLayer}>
            <FoldTimeline
              ref={tl}
              items={milestones}
              tone="teal"
              background="transparent"
              scrollMode="external"
              layout="horizontal"
              startFolded
              foldOnEnter={false}
              height={TL_PER_STOP}
              unfoldLength={TL_UNFOLD}
              title="DVM, year by year"
            />
          </div>
        )}

        <svg className={s.bridge} ref={bridgeRef} viewBox={LOGO_VIEWBOX} aria-hidden="true">
          {LOGO_PATHS.map((d) => (
            <path key={d} d={d} pathLength="1" />
          ))}
        </svg>

        {mount.archive && (
          <div className={`${s.layer} ${s.fadeLayer}`} ref={archLayer}>
            <ArchiveTeaser />
          </div>
        )}
      </div>

      {/* ===== the medium rail: where the mark is in its sequence ===== */}
      <nav className={s.rail} aria-label="Story">
        <div className={s.railTrack}>
          <div className={s.railFill} ref={railFill} />
        </div>
        <ol>
          {MEDIUMS.map((m, i) => (
            <li key={m.id}>
              <button type="button" className={i === medium ? s.railOn : undefined} aria-current={i === medium ? "step" : undefined} onClick={() => jumpTo(i)}>
                <span className={s.railNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={s.railLabel}>{m.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* ===== the scroll track: real content scrolling over the stage ===== */}
      <main className={s.track} ref={reg("track")}>
        <section className={`${s.sec} ${s.hero}`} ref={reg("hero")} id="hero-container">
          <div ref={heroTextRef} className={s.heroText}>
            <h1 className={s.dept}>
              <span>Department of</span>
              <span className={s.deptBig}>Visual Media</span>
            </h1>
            <p className={s.slogan}>
              <span>CODE.</span>
              <span>DESIGN.</span>
              <span>ANIMATE.</span>
            </p>
            <p className={s.cue}>Scroll to change the medium</p>
          </div>
        </section>

        <section className={s.shatter} ref={reg("shatter")} aria-hidden="true" />

        <section className={`${s.sec} ${s.chapter}`} ref={reg("about")} id="about" aria-labelledby="v3-about">
          <div className={s.col}>
            <h2 className={s.title} id="v3-about">
              <span className={s.titleGhost} aria-hidden="true">ABOUT US</span>
              <span className={s.titleSolid}>ABOUT US</span>
            </h2>
            {site.about.map((p) => (
              <p key={p} className={s.body}>
                {p}
              </p>
            ))}
            <Link to="/about" className={s.more}>
              More about DVM
            </Link>
          </div>
        </section>

        <div className={s.teamsHead} ref={reg("teams")}>
          <h2 className={s.title}>
            <span className={s.titleGhost} aria-hidden="true">FIVE TEAMS</span>
            <span className={s.titleSolid}>FIVE TEAMS</span>
          </h2>
        </div>
        {verticals.map((v, i) => (
          <section key={v.id} className={`${s.sec} ${s.team}`} ref={reg(`team${i}`)} aria-labelledby={`v3-team-${v.id}`}>
            <div className={s.col}>
              <p className={s.count}>
                {i + 1} / {verticals.length}
              </p>
              <h3 className={s.teamName} id={`v3-team-${v.id}`}>
                {v.name}
              </h3>
              <p className={s.body}>{v.description}</p>
            </div>
          </section>
        ))}

        <section className={`${s.sec} ${s.statsSec}`} ref={reg("stats")} aria-labelledby="v3-stats">
          <div className={s.col}>
            <h2 className={s.title} id="v3-stats">
              <span className={s.titleGhost} aria-hidden="true">IN NUMBERS</span>
              <span className={s.titleSolid}>IN NUMBERS</span>
            </h2>
            <dl className={s.stats}>
              {STATS.map((st) => (
                <div key={st.label} className={s.stat}>
                  <dt>{st.label}</dt>
                  <dd>{st.display}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {FEST_LIST.map((f, i) => (
          <section key={f.id} className={`${s.sec} ${s.fest}`} ref={reg(`fest${i}`)} aria-labelledby={`v3-fest-${f.id}`}>
            <div className={s.col}>
              <p className={s.count}>Fest {i + 1} of 3</p>
              <h3 className={s.festName} id={`v3-fest-${f.id}`}>
                {f.name}
              </h3>
              <p className={s.body}>{firstSentence(f.blurb)}</p>
              <a className={s.more} href={f.website} target="_blank" rel="noreferrer">
                Visit {f.name}
              </a>
            </div>
          </section>
        ))}

        <section className={`${s.sec} ${s.settle}`} ref={reg("settle")} id="legacy" aria-labelledby="v3-legacy">
          <div className={s.col}>
            <h2 className={s.title} id="v3-legacy">
              <span className={s.titleGhost} aria-hidden="true">OUR LEGACY</span>
              <span className={s.titleSolid}>OUR LEGACY</span>
            </h2>
            <p className={s.body}>
              The mark is one strip of paper with seven creases. Keep scrolling and it unfolds into every year of DVM: fest themes, firsts and
              the people who joined.
            </p>
          </div>
        </section>

        {flowTimeline ? (
          <section className={s.legacyFlow} ref={reg("legacy")}>
            <FoldTimeline items={milestones} tone="teal" layout="vertical" title="DVM, year by year" />
          </section>
        ) : (
          <section className={s.legacyTrack} ref={reg("legacy")} style={{ height: `${(tlLength * 100).toFixed(1)}vh` }} aria-hidden="true" />
        )}

        <section className={s.archiveTrack} ref={reg("archive")} aria-label="Archive" />

        <div className={s.end} role="contentinfo" ref={reg("end")}>
          <div className={s.endBrand}>DVM</div>
          <ul className={s.endLinks}>
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/projects">Projects</Link></li>
            <li><Link to="/team">Team</Link></li>
            <li><Link to="/artwork">Artwork</Link></li>
            <li><Link to="/archive">Archive</Link></li>
            <li><Link to="/contactus">Contact us</Link></li>
          </ul>
          <ul className={s.endSocial}>
            {socials.map((x) => (
              <li key={x.id}>
                <a href={x.url} target="_blank" rel="noreferrer">
                  {x.label}
                </a>
              </li>
            ))}
          </ul>
          <p className={s.endNote}>{site.taglines.footer}</p>
        </div>
      </main>
    </div>
  );
}
