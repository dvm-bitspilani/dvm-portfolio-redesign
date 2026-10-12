// V2 hero + About: "Mercury Lake".
// A horizon line splits the viewport. The outlined DVM letters stand on it; the
// liquid mark stands off-centre on the surface with its own raymarched reflection;
// the lake below mirrors the letters and bends the grid into perspective.
// Scrolling lifts the mark off the lake (chrome → glass) and carries it beside the
// About copy, where it turns to x-ray.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MercuryLogo, paintHeroBackdrop } from "../../../immersive/kit/mercury";
import { AsciiLogo } from "../../../immersive/kit/ascii";
import { site, stats } from "../../../immersive/data";
import bg3 from "../../../assests/bg_3.png";
import lettersSrc from "../../../assests/image.png";
import { Lake } from "./lake";
import { loadImage, useMedia, useNear, useReducedMotion } from "../lib/hooks";
import s from "./home.module.css";

gsap.registerPlugin(ScrollTrigger);

const LETTERS_ASPECT = 3456 / 753;
const ABOUT_STATS = stats.filter((x) => ["users on our apps and websites", "fests: BOSM, Oasis & APOGEE", "teams"].includes(x.label));

/** Where everything sits, in CSS px of the viewport-sized stage. */
function computeLayout(W, H) {
  const mobile = W <= 768;
  const horizon = Math.round(H * (mobile ? 0.68 : 0.7));
  // mobile: the copy block owns the top ~290px, the mark stands between it and the waterline
  const markH = mobile ? Math.max(150, Math.min(H * 0.36, (W * 0.8) / 0.8, horizon - 300)) : Math.min(H * 0.64, horizon - 64);
  const markCX = mobile ? W * 0.5 : W * 0.635;
  // the shader's mirror floor sits just under the mark's tip: sink the tip onto the waterline
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
    // where the mark rests beside the About copy
    aboutCX: mobile ? W * 0.5 : W * 0.255,
    aboutCY: mobile ? H * 0.42 : H * 0.53,
    fit: {
      mode: "height",
      padding: Math.max(0, (1 - markH / H) / 2),
      x: (markCX - W / 2) / (W / 2),
      y: (markCY - H / 2) / (H / 2),
    },
  };
}

function useStageLayout(ref) {
  const [layout, setLayout] = useState(() => computeLayout(window.innerWidth, window.innerHeight));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = computeLayout(el.clientWidth, el.clientHeight);
        setLayout((prev) => (prev.W === next.W && prev.H === next.H ? prev : next));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ref]);
  return layout;
}

/** The mercury mark. Re-renders only when the reflection strength steps (scroll), not per frame. */
function Mercury({ mercRef, layout, pointerTarget, backdrop, reflectRef, reduced, intro }) {
  const [reflection, setReflection] = useState(1);
  reflectRef.current = setReflection;
  return (
    <MercuryLogo
      ref={mercRef}
      fit={layout.fit}
      reflection={reflection * (layout.mobile ? 2.2 : 3)}
      shadow={0}
      sheen={1.1}
      rotation={{ yaw: 0.1, pitch: -0.1 }}
      pointerTarget={pointerTarget}
      backdrop={backdrop}
      intro={intro}
      introDelay={reduced ? 0 : 1.05}
      smoothing={0}
      label="DVM, the Department of Visual Media mark in liquid mercury"
    />
  );
}

export default function MarkStage({ ascii = false }) {
  const wrapRef = useRef(null);
  const heroRef = useRef(null);
  const layerRef = useRef(null);
  const boxRef = useRef(null);
  const mercRef = useRef(null);
  const reflectRef = useRef(() => {});
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
  const reduced = useReducedMotion();
  const coarse = useMedia("(pointer: coarse)");
  const layout = useStageLayout(layerRef);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const [backdropCanvas, setBackdropCanvas] = useState(null);
  const asciiRef = useRef(ascii);
  asciiRef.current = ascii;
  // Unmount the GL mark once hero + About are far away (the timeline / swarm / CRT
  // further down get the context budget); remounts without the intro.
  const near = useNear(wrapRef, "60% 0px");
  const introDone = useRef(false);
  useEffect(() => {
    if (near) {
      const t = setTimeout(() => (introDone.current = true), 3000);
      return () => clearTimeout(t);
    }
  }, [near]);

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

  // ---- what the glass refracts: the About backdrop (texture through its mask + grid)
  useEffect(() => {
    let alive = true;
    const c = document.createElement("canvas");
    loadImage(bg3).then((texture) => {
      if (!alive) return;
      const L = layoutRef.current;
      paintHeroBackdrop(c, {
        width: L.W,
        height: L.H,
        texture,
        mask: { x: L.aboutCX, y: L.aboutCY, r: L.W * (L.mobile ? 0.7 : 0.42) },
        colorWash: true,
      });
      setBackdropCanvas(c);
      mercRef.current?.refreshBackdrop();
    });
    return () => {
      alive = false;
    };
  }, [layout.W, layout.H]);

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
      // lean toward the pointer, but keep the light anchored around the mark
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

  // ---- intro + scroll choreography
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const layer = layerRef.current;
    if (!wrap || !layer) return;
    const lake = lakeRef.current;
    const st = { lift: 0, prog: 0, fade: 1 };
    let lastRefl = 1;

    const apply = () => {
      const L = layoutRef.current;
      const lift = st.lift;
      const dx = (L.aboutCX - L.markCX) * lift;
      const dy = (L.aboutCY - L.markCY) * lift;
      if (boxRef.current) boxRef.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      layer.style.opacity = String(st.fade * (L.mobile ? 1 - 0.55 * Math.min(1, lift * 1.4) : 1));
      layer.style.visibility = st.fade < 0.01 ? "hidden" : "visible";
      if (!asciiRef.current) {
        mercRef.current?.setProgress(st.prog);
        mercRef.current?.setRotation(0.1 + lift * 0.32 - Math.max(0, st.prog - 1) * 0.3, -0.1 + lift * 0.06);
      }
      const refl = Math.max(0, 1 - lift * 2.2);
      const q = Math.round(refl * 20) / 20;
      if (q !== lastRefl) {
        lastRefl = q;
        reflectRef.current(q);
      }
      if (lake) lake.state.sink = Math.min(1, lift * 1.15);
      if (lettersSinkRef.current) lettersSinkRef.current.style.transform = `translate3d(0, ${(Math.min(1, lift * 1.15) * 100).toFixed(2)}%, 0)`;
      if (!reduced && lake && !lake.running) lake.draw();
    };

    const ctx = gsap.context(() => {
      // pin the viewport-sized mark layer across hero + About
      ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        pin: layer,
        pinSpacing: false,
        invalidateOnRefresh: true,
      });

      const heroH = () => heroRef.current.offsetHeight;
      const total = () => Math.max(1, wrap.offsetHeight - window.innerHeight);
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: "bottom bottom",
          scrub: reduced ? true : 0.6,
          invalidateOnRefresh: true,
        },
        onUpdate: apply,
      });
      // durations are proportional to scroll distance (hero leaves, then About)
      const a = heroH() / total();
      tl.to(st, { lift: 1, prog: 1, duration: a, ease: "power1.inOut" })
        .to(st, { prog: 2, duration: (1 - a) * 0.72 })
        .to(st, { fade: 0, duration: (1 - a) * 0.28 });

      // intro
      if (!reduced) {
        const intro = gsap.timeline({ delay: 0.15 });
        gsap.set(horizonRef.current, { scaleX: 0 });
        gsap.set(lettersRiseRef.current, { yPercent: 104 });
        gsap.set([gridRef.current, skyTexRef.current], { autoAlpha: 0 });
        gsap.set(copyRef.current.children, { autoAlpha: 0, y: 24 });
        gsap.set(lakeCopyRef.current.children, { autoAlpha: 0, y: 12 });
        if (lake) lake.state.reveal = 0;
        intro
          .to(horizonRef.current, { scaleX: 1, duration: 1.1, ease: "expo.inOut" }, 0)
          .to([gridRef.current, skyTexRef.current], { autoAlpha: 1, duration: 1.0, ease: "power1.out" }, 0.45)
          .to(lake ? lake.state : {}, { reveal: 1, duration: 1.6, ease: "power3.out" }, 0.55)
          .to(lettersRiseRef.current, { yPercent: 0, duration: 1.5, ease: "power3.out" }, 0.6)
          .to(copyRef.current.children, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 1.2)
          .to(lakeCopyRef.current.children, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power2.out" }, 1.5);
      }

      // About copy reveals as it arrives
      const aboutEls = aboutRef.current.querySelectorAll("[data-reveal]");
      if (!reduced)
        gsap.from(aboutEls, {
          autoAlpha: 0,
          y: 36,
          stagger: 0.08,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: aboutRef.current, start: "top 62%" },
        });
    }, wrap);

    apply();
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      window.removeEventListener("load", onLoad);
      ctx.revert();
    };
  }, [reduced]);

  const L = layout;
  const markRect = {
    left: L.markCX - (L.markH * 0.8) / 2,
    top: L.markCY - L.markH / 2,
    width: L.markH * 0.8,
    height: L.markH,
  };

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
          <p className={s.hint}>{ascii
              ? "Drag the mark to spin it."
              : coarse
                ? "Drag through the mark to pull the mercury. Tap to drop a bead."
                : "Move through the mark to pull the mercury. Click to drop a bead."}</p>
        </div>
      </section>

      <section ref={aboutRef} id="about" className={s.about} aria-labelledby="v2-about-title">
        <div id="about-container" className={s.aboutBg} aria-hidden="true">
          <div className={s.grid} />
          <div
            className={s.aboutTexture}
            style={{
              backgroundImage: `url(${bg3})`,
              "--ax": `${L.aboutCX}px`,
              "--ay": `${L.aboutCY}px`,
            }}
          />
        </div>
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
        </div>
      </section>

      <div ref={layerRef} className={s.markLayer} aria-hidden={ascii ? "true" : undefined}>
        <div ref={boxRef} className={s.markBox}>
          {ascii ? (
            <div className={s.asciiMark} style={markRect}>
              <AsciiLogo
                transparent
                palette="teal"
                scale={0.86}
                autoRotate={reduced ? false : "sway"}
                reveal="decode"
                probe={false}
                crt={{ curvature: 0, grille: 0, vignette: 0, scanlines: 0.5, noise: 0.35, bloom: 0.8 }}
              />
            </div>
          ) : !near ? null : (
            <Mercury
              intro={!introDone.current}
              mercRef={mercRef}
              layout={L}
              pointerTarget={wrapRef}
              backdrop={backdropCanvas ? { source: backdropCanvas, element: layerRef, frost: 1.1 } : null}
              reflectRef={reflectRef}
              reduced={reduced}
            />
          )}
        </div>
      </div>
    </div>
  );
}
