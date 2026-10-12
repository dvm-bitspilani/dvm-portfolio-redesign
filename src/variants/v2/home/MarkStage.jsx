// V2 hero + About: "Mercury Lake".
// A horizon line splits the viewport. The outlined DVM letters stand on it; the
// liquid mark stands off-centre on the surface with its own raymarched reflection;
// the lake below mirrors the letters and bends the grid into perspective.
//
// The mark itself is the variant's one live MercuryLogo (chrome/mark.jsx), borrowed
// for this page. Scroll choreography (scrubbed, reversible):
//   hero      chrome, standing on the lake
//   → About   lifts off the water and turns to clear glass beside the copy (it refracts
//             the teal light behind it), holds there while the copy is read, then x-ray
//   → runway  collapses, flips (a real 3D yaw turn, so the lighting moves) while it
//             condenses back to chrome, shrinks and docks in the navbar slot, where it
//             stays for the rest of the site. Clicking it scrolls back to the top.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { paintHeroBackdrop } from "../../../immersive/kit/mercury";
import { site, stats } from "../../../immersive/data";
import bg3 from "../../../assests/bg_3.png";
import lettersSrc from "../../../assests/image.png";
import { Lake } from "./lake";
import { loadImage, useMedia, useReducedMotion } from "../lib/hooks";
import { DOCK_PITCH, DOCK_YAW, Z, useMark } from "../chrome/mark";
import { useChrome } from "../chrome/shell";
import s from "./home.module.css";

gsap.registerPlugin(ScrollTrigger);

const OWNER = "home";
const LETTERS_ASPECT = 3456 / 753;
const ABOUT_STATS = stats.filter((x) => ["users on our apps and websites", "fests: BOSM, Oasis & APOGEE", "teams"].includes(x.label));
const TAU = Math.PI * 2;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (y, a, b) => clamp01((y - a) / Math.max(1, b - a)); // scroll px ranges
const sub = (t, a, b) => clamp01((t - a) / (b - a)); // 0..1 sub-ranges
const lerp = (a, b, t) => a + (b - a) * t;
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const inOut3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Where everything sits, in CSS px of the viewport. */
function computeLayout(W, H) {
  const mobile = W <= 768;
  const horizon = Math.round(H * (mobile ? 0.68 : 0.7));
  // mobile: the copy block owns the top ~290px, the mark stands between it and the waterline
  const markH = mobile ? Math.max(150, Math.min(H * 0.36, (W * 0.8) / 0.8, horizon - 300)) : Math.min(H * 0.64, horizon - 64);
  const markCX = mobile ? W * 0.5 : W * 0.635;
  // the mirror floor sits just under the mark's tip: sink the tip onto the waterline
  const markCY = horizon - markH / 2 + markH * 0.05;
  const lettersW = mobile ? W * 1.02 : W;
  const lettersH = lettersW / LETTERS_ASPECT;
  return {
    mobile,
    W,
    H,
    horizon,
    markH,
    markCX,
    markCY,
    letters: { x: (W - lettersW) / 2, w: lettersW, h: lettersH },
    // where the mark rests (as glass) beside the About copy
    aboutCX: mobile ? W * 0.5 : W * 0.255,
    aboutCY: mobile ? H * 0.34 : H * 0.53,
    aboutH: mobile ? Math.min(H * 0.42, W * 0.95) : Math.min(H * 0.66, W * 0.4),
  };
}

function useStageLayout() {
  const [layout, setLayout] = useState(() => computeLayout(window.innerWidth, window.innerHeight));
  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = computeLayout(window.innerWidth, window.innerHeight);
        setLayout((prev) => (prev.W === next.W && prev.H === next.H ? prev : next));
      });
    };
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return layout;
}

export default function MarkStage() {
  const wrapRef = useRef(null);
  const heroRef = useRef(null);
  const lakeCanvasRef = useRef(null);
  const lakeRef = useRef(null);
  const skyTexRef = useRef(null);
  const horizonRef = useRef(null);
  const lettersSinkRef = useRef(null);
  const lettersRiseRef = useRef(null);
  const gridRef = useRef(null);
  const copyRef = useRef(null);
  const lakeCopyRef = useRef(null);
  const aboutRef = useRef(null);
  const auraRef = useRef(null);
  const collapseRef = useRef(null);
  const mark = useMark();
  const { revealed } = useChrome();
  const reduced = useReducedMotion();
  const coarse = useMedia("(pointer: coarse)");
  const layout = useStageLayout();
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const backdropRef = useRef(null);
  const [auraCanvas, setAuraCanvas] = useState(null);

  // ---- borrow the brand mark for this page (it flies in from wherever it is)
  useLayoutEffect(() => {
    if (!mark) return;
    const L = layoutRef.current;
    mark.claim(
      OWNER,
      { reflection: L.mobile ? 2.2 : 3, pointerTarget: wrapRef.current, interactive: true, sheen: 1.1, tilt: 1, sway: 1 },
      { x: L.markCX, y: L.markCY, h: L.markH, yaw: 0.1, pitch: -0.1, prog: 0, op: 1, z: Z.page },
    );
    return () => mark.release(OWNER);
  }, [mark]);

  // ---- lake canvas lifecycle (layout effect: the choreography below needs it)
  useLayoutEffect(() => {
    const c = lakeCanvasRef.current;
    if (!c) return;
    const lake = new Lake(c, { reduced });
    lakeRef.current = lake;
    let alive = true;
    const size = () => lake.resize(c.clientWidth, c.clientHeight);
    size();
    const ro = new ResizeObserver(size);
    ro.observe(c);
    loadImage(lettersSrc).then((img) => {
      if (!alive) return;
      const L = layoutRef.current;
      lake.setLetters(img, L.letters.x, L.letters.w, L.letters.h);
    });
    lake.kick();
    return () => {
      alive = false;
      ro.disconnect();
      lake.dispose();
      lakeRef.current = null;
    };
  }, [reduced]);

  // keep the lake in step with the layout
  useEffect(() => {
    const lake = lakeRef.current;
    if (!lake) return;
    lake.markX = layout.markCX / layout.W;
    if (lake.letters.img) lake.setLetters(lake.letters.img, layout.letters.x, layout.letters.w, layout.letters.h);
  }, [layout]);

  // ---- what the glass refracts: the About light (teal texture through its mask + grid),
  // painted at viewport size to match the fixed aura layer behind the mark.
  useEffect(() => {
    let alive = true;
    const c = document.createElement("canvas");
    loadImage(bg3).then((texture) => {
      if (!alive) return;
      const L = layoutRef.current;
      paintHeroBackdrop(c, {
        width: L.W,
        height: L.H,
        scale: 1,
        texture,
        textureOpacity: 1,
        mask: { x: L.aboutCX, y: L.aboutCY, r: L.W * (L.mobile ? 0.85 : 0.5) },
        gridAlpha: 0.13,
        colorWash: false,
      });
      setAuraCanvas(c);
      mark?.merc.current?.refreshBackdrop();
    });
    return () => {
      alive = false;
    };
  }, [layout.W, layout.H, mark]);

  useEffect(() => {
    if (!auraCanvas || !mark) return;
    backdropRef.current = { source: auraCanvas, element: auraRef.current, frost: 0, clarity: 0.9 };
    mark.setOwnerProps(OWNER, { backdrop: backdropRef.current });
    mark.merc.current?.refreshBackdrop();
  }, [auraCanvas, mark]);

  // ---- cursor light: the sky texture's radial reveal drifts toward the pointer
  useEffect(() => {
    const hero = heroRef.current;
    const tex = skyTexRef.current;
    if (!hero || !tex) return;
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    const home = () => {
      const L = layoutRef.current;
      pos.tx = L.markCX + L.W * 0.02;
      pos.ty = L.horizon * 0.42;
    };
    home();
    pos.x = pos.tx;
    pos.y = pos.ty;
    const paint = () => {
      const m = `radial-gradient(circle ${layoutRef.current.mobile ? 70 : 38}vw at ${pos.x.toFixed(1)}px ${pos.y.toFixed(1)}px, #000 0%, transparent 100%)`;
      tex.style.webkitMaskImage = m;
      tex.style.maskImage = m;
    };
    paint();
    if (reduced || coarse) return;
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
      const L = layoutRef.current;
      pos.tx = L.markCX + (e.clientX - r.left - L.markCX) * 0.6;
      pos.ty = Math.min(L.horizon, e.clientY - r.top) * 0.85;
      go();
    };
    const onLeave = () => {
      home();
      go();
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, coarse, layout]);

  // ---- clicks on the hero send rings across the lake (the kit drops the bead itself)
  const onHeroClick = useCallback((e) => {
    if (e.target.closest("a, button, input, label, [data-noblob]")) return;
    const r = heroRef.current.getBoundingClientRect();
    lakeRef.current?.ring(e.clientX - r.left);
  }, []);

  // ---- scroll choreography
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !mark) return;
    const lake = lakeRef.current;
    const proxy = { p: 0 };
    const marks = { A: 1, xs: 1, cs: 1, ce: 2, aboutBottom: 3 };
    let lastRefl = -1;
    let lastPhase = "";

    const pageTop = (el) => el.getBoundingClientRect().top + window.scrollY;
    const measure = () => {
      const H = window.innerHeight;
      const A = heroRef.current.offsetHeight;
      // E: page y where the About copy ends. The glass holds while it is read, turns to
      // x-ray as the stats pass, then the mark collapses while Blogs scrolls in.
      const E = pageTop(collapseRef.current) - pageTop(wrap);
      const aboutBottom = pageTop(aboutRef.current) - pageTop(wrap) + aboutRef.current.offsetHeight;
      marks.A = A;
      marks.cs = Math.max(A + H * 0.5, E - H * 0.35);
      marks.ce = Math.max(marks.cs + H * 0.4, E + H * 0.45);
      marks.xs = Math.max(A + H * 0.25, E - H * 0.85);
      marks.aboutBottom = aboutBottom;
      return marks.ce;
    };
    measure();

    const phaseProps = (phase) => {
      if (phase === lastPhase) return;
      lastPhase = phase;
      if (phase === "stage") mark.setOwnerProps(OWNER, { interactive: true, pointerTarget: wrapRef.current, fps: 0 });
      else if (phase === "flight") mark.setOwnerProps(OWNER, { interactive: false, pointerTarget: "window", fps: 0 });
      else mark.setOwnerProps(OWNER, { interactive: false, pointerTarget: "window", fps: 30 });
    };

    const apply = () => {
      const L = layoutRef.current;
      const { A, xs, cs, ce, aboutBottom } = marks;
      const y = proxy.p * ce;
      const dock = mark.dockPose();
      let pose;
      let c = 0;
      let lift = 0;

      if (reduced) {
        // no flight or flip: the mark scrolls with the hero like any element, then is
        // simply docked once the hero is half gone
        const docked = y > A * 0.45;
        lift = docked ? 1 : 0;
        c = docked ? 1 : 0;
        pose = docked ? dock : { x: L.markCX, y: L.markCY - y, h: L.markH, yaw: 0.1, pitch: -0.1, prog: 0, op: 1, z: Z.page };
      } else {
        lift = inOut(seg(y, 0, A * 0.95));
        // material: chrome → glass across the hero, clear glass through the copy, x-ray at its end
        let prog = inOut(seg(y, A * 0.12, A)) + 0.08 * seg(y, A, xs) + 0.92 * inOut(seg(y, xs, cs));
        const yawStage = 0.1 + lift * 0.12 - Math.max(0, prog - 1) * 0.3;
        const pitchStage = -0.1 + lift * 0.04;
        const x0 = lerp(L.markCX, L.aboutCX, lift);
        const y0 = lerp(L.markCY, L.aboutCY, lift);
        const h0 = Math.exp(lerp(Math.log(L.markH), Math.log(L.aboutH), lift));
        const op0 = L.mobile ? 1 - 0.15 * Math.min(1, lift * 1.4) : 1;

        c = seg(y, cs, ce);
        if (c <= 0) {
          pose = { x: x0, y: y0, h: h0, yaw: yawStage, pitch: pitchStage, prog, op: op0, z: Z.page };
        } else {
          // collapse in place → flip while condensing to chrome → shrink and dock
          const size = inOut3(c);
          const travel = inOut(sub(c, 0.18, 1));
          const flip = inOut(sub(c, 0.08, 0.86));
          const solid = inOut(sub(c, 0.12, 0.62));
          const arc = Math.sin(Math.PI * travel);
          pose = {
            x: lerp(x0, dock.x, travel) + arc * (L.mobile ? 0 : L.W * 0.05),
            y: lerp(y0, dock.y, travel) - arc * L.H * 0.04,
            h: Math.exp(lerp(Math.log(h0), Math.log(dock.h), size)),
            yaw: lerp(yawStage, DOCK_YAW + TAU, flip),
            pitch: lerp(pitchStage, DOCK_PITCH, flip) + Math.sin(Math.PI * flip) * 0.32,
            prog: lerp(prog, 0, solid),
            op: lerp(op0, 1, sub(c, 0, 0.3)),
            z: c > 0.22 ? Z.dock : Z.page,
          };
          prog = pose.prog;
        }
      }
      mark.push(OWNER, pose);
      phaseProps(c >= 1 ? "docked" : c > 0 ? "flight" : "stage");

      // the lake's mirror pool fades as the mark lifts off the water
      const refl = Math.max(0, 1 - lift * 2.2);
      const q = Math.round(refl * 20) / 20;
      if (q !== lastRefl) {
        lastRefl = q;
        mark.setOwnerProps(OWNER, { reflection: q * (L.mobile ? 2.2 : 3) });
      }

      // the About light: a fixed layer behind the mark, clipped to the About section
      const aura = auraRef.current;
      if (aura) {
        const aOp = reduced ? 0 : seg(y, A * 0.45, A * 0.95) * (1 - sub(c, 0, 0.45));
        aura.style.opacity = aOp.toFixed(3);
        aura.style.visibility = aOp < 0.01 ? "hidden" : "visible";
        const vh = window.innerHeight;
        aura.style.clipPath = `inset(${Math.max(0, A - y).toFixed(1)}px 0 ${Math.max(0, vh - (aboutBottom - y)).toFixed(1)}px 0)`;
      }

      if (lake) lake.state.sink = Math.min(1, lift * 1.15);
      if (lettersSinkRef.current) lettersSinkRef.current.style.transform = `translate3d(0, ${(Math.min(1, lift * 1.15) * 100).toFixed(2)}%, 0)`;
      if (!reduced && lake && !lake.running) lake.draw();
    };

    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        p: 1,
        ease: "none",
        onUpdate: apply,
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: () => `+=${measure()}`,
          scrub: reduced ? true : 0.7,
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure();
            apply();
          },
        },
      });

      // each About beat reveals as it arrives beside the glass mark
      if (!reduced)
        aboutRef.current.querySelectorAll("[data-reveal]").forEach((el) =>
          gsap.from(el, {
            autoAlpha: 0,
            y: 36,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 86%" },
          }),
        );
    }, wrap);

    apply();
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      window.removeEventListener("load", onLoad);
      ctx.revert();
    };
  }, [reduced, mark]);

  // re-pose for a new layout (resize)
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [layout]);

  // ---- hero intro, held until the preloader starts to dissolve
  const introRan = useRef(false);
  useLayoutEffect(() => {
    if (reduced || introRan.current) return;
    const lake = lakeRef.current;
    const hide = () => {
      gsap.set(horizonRef.current, { scaleX: 0 });
      gsap.set(lettersRiseRef.current, { yPercent: 104 });
      gsap.set([gridRef.current, skyTexRef.current], { autoAlpha: 0 });
      gsap.set(copyRef.current.children, { autoAlpha: 0, y: 24 });
      gsap.set(lakeCopyRef.current.children, { autoAlpha: 0, y: 12 });
      if (lake) lake.state.reveal = 0;
    };
    hide();
    if (!revealed) return;
    introRan.current = true;
    const intro = gsap.timeline({ delay: 0.15 });
    intro
      .to(horizonRef.current, { scaleX: 1, duration: 1.1, ease: "expo.inOut" }, 0)
      .to([gridRef.current, skyTexRef.current], { autoAlpha: 1, duration: 1.0, ease: "power1.out" }, 0.45)
      .to(lake ? lake.state : {}, { reveal: 1, duration: 1.6, ease: "power3.out", onUpdate: () => lake && !lake.running && lake.draw() }, 0.55)
      .to(lettersRiseRef.current, { yPercent: 0, duration: 1.5, ease: "power3.out" }, 0.6)
      .to(copyRef.current.children, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 1.2)
      .to(lakeCopyRef.current.children, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power2.out" }, 1.5);
    return () => {
      intro.progress(1).kill();
    };
  }, [revealed, reduced]);

  const L = layout;

  return (
    <div ref={wrapRef} className={s.stageWrap}>
      <section
        ref={heroRef}
        id="top"
        className={s.hero}
        onClick={onHeroClick}
        style={{ "--horizon": `${L.horizon}px` }}
        aria-label="Department of Visual Media"
      >
        <div className={s.sky} aria-hidden="true">
          <div ref={gridRef} className={s.grid} />
          <div ref={skyTexRef} className={s.skyTexture} style={{ backgroundImage: `url(${bg3})` }} />
          <div className={s.wash} />
          <div className={s.lettersClip}>
            <div ref={lettersSinkRef} className={s.lettersSink}>
              <img
                ref={lettersRiseRef}
                src={lettersSrc}
                alt=""
                className={s.letters}
                style={{ left: L.letters.x, width: L.letters.w, height: L.letters.h }}
                draggable={false}
              />
            </div>
          </div>
        </div>

        <div className={s.lake} aria-hidden="true">
          <div className={s.lakeGlow} style={{ "--mx": `${(L.markCX / L.W) * 100}%`, backgroundImage: `url(${bg3})` }} />
          <canvas ref={lakeCanvasRef} className={s.lakeCanvas} />
        </div>
        <div ref={horizonRef} className={s.horizon} aria-hidden="true" />

        <div ref={copyRef} className={s.heroCopy}>
          <p className={s.kicker}>Department of</p>
          <h1 className={s.heroTitle}>
            <span className={s.srOnly}>Department of </span>Visual
            <br />
            Media
          </h1>
          <p className={s.heroLede}>We build the websites, apps and trailers for BITS Pilani’s three fests: BOSM, Oasis and APOGEE.</p>
        </div>

        <div ref={lakeCopyRef} className={s.lakeCopy}>
          <p className={s.motto}>
            <span>Code.</span> <span>Design.</span> <span>Animate.</span>
          </p>
          <p className={s.hint}>
            {coarse ? "Drag through the mark to pull the mercury. Tap to drop a bead." : "Move through the mark to pull the mercury. Click to drop a bead."}
          </p>
        </div>
      </section>

      <section ref={aboutRef} id="about" className={s.about} aria-labelledby="v2-about-title">
        <div id="about-container" className={s.aboutBg} aria-hidden="true">
          <div className={s.grid} />
        </div>
        {/* fixed teal light behind the glass mark (also what the glass refracts) */}
        <div
          ref={auraRef}
          className={s.aura}
          aria-hidden="true"
          style={{
            backgroundImage: `url(${bg3})`,
            "--ax": `${L.aboutCX}px`,
            "--ay": `${L.aboutCY}px`,
            "--ar": `${L.W * (L.mobile ? 0.85 : 0.5)}px`,
          }}
        />
        <div className={s.aboutInner}>
          <div className={s.aboutHead} data-reveal>
            <h2 id="v2-about-title" className={s.aboutTitle}>
              About us
            </h2>
            <span className={s.aboutTitleOutline} aria-hidden="true">
              About us
            </span>
          </div>
          <div className={s.aboutCopy}>
            {site.about.map((p) => (
              <p key={p.slice(0, 24)} data-reveal>
                {p}
              </p>
            ))}
          </div>
          <dl className={s.aboutStats} data-reveal>
            {ABOUT_STATS.map((x) => (
              <div key={x.label}>
                <dt>{x.label}</dt>
                <dd>{x.display}</dd>
              </div>
            ))}
          </dl>
          <span ref={collapseRef} className={s.collapseMark} aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
