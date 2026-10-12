import styles from "./HomePage.module.css";
import dvm_text from "../../../assests/image.png";
import bg3 from "../../../assests/bg_3.png";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect, useState } from "react";
import { paintHeroBackdrop } from "../../../immersive/kit/mercury";
import { useBoot } from "../boot";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import AboutPage from "./About";
import Logo from "./Logo";

gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
  const textureRef = useRef(null);
  const gradientRef = useRef(null);
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const dvm_textRef = useRef(null);
  const dvm_Ref = useRef(null);
  const code_ref = useRef(null);
  const about_ref = useRef(null);
  const lineRef = useRef(null);
  const line1Ref = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });
  const location = useLocation();
  const { revealed } = useBoot();
  const introRef = useRef(null);
  const mercRef = useRef(null);
  const [backdrop, setBackdrop] = useState(null);
  const repaintRef = useRef(() => {});

  // What the glass refracts: the hero's own layers painted into a canvas
  // (texture through the same moving mask, grid, outlined letters, wash).
  useEffect(() => {
    let alive = true;
    let ro = null;
    let raf = 0;
    const canvas = document.createElement("canvas");
    const load = (src) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    Promise.all([load(bg3), load(dvm_text)])
      .then(([texture, letters]) => {
        const hero = containerRef.current;
        if (!alive || !hero) return;
        const paint = () => {
          raf = 0;
          const w = hero.clientWidth;
          const h = hero.clientHeight;
          const { x, y } = gradientPos.current;
          paintHeroBackdrop(canvas, {
            width: w,
            height: h,
            texture,
            letters,
            mask: { x: x + window.innerWidth * 0.6, y: y + window.innerHeight * 0.2, r: window.innerWidth * 0.4 },
          });
          mercRef.current?.refreshBackdrop();
        };
        repaintRef.current = () => {
          if (!raf) raf = requestAnimationFrame(paint);
        };
        paint();
        setBackdrop(canvas);
        ro = new ResizeObserver(() => repaintRef.current());
        ro.observe(hero);
      })
      .catch(() => {});
    return () => {
      alive = false;
      repaintRef.current = () => {};
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateMask = () => {
      if (!textureRef.current) return;
      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.6;
      const centerY = y + window.innerHeight * 0.2;
      const mask = `radial-gradient(circle 40vw at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
      repaintRef.current();
    };

    updateMask();

    const tween = gsap.to(gradientPos.current, {
      x: -window.innerWidth * 1.5,
      y: window.innerHeight,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 10%",
        end: "bottom -100%",
        scrub: 1,
      },
      onUpdate: updateMask,
    });

    return () => {
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
    };
  }, []);

  useEffect(() => {
    const tween = gsap.to(gradientRef.current, {
      x: -window.innerWidth * 1.5,
      y: window.innerHeight,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 10%",
        end: "bottom -100%",
        scrub: 1,
      },
    });

    return () => {
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
    };
  }, []);

  useEffect(() => {
    gsap.set(dvm_textRef.current, {
      clipPath: "inset(0 100% 0 0)",
      webkitClipPath: "inset(0 100% 0 0)",
    });
    gsap.set(
      [gridRef.current, textureRef.current, gradientRef.current, lineRef.current, line1Ref.current],
      { autoAlpha: 0 },
    );

    // Starts when the ASCII boot powers off onto the page (see index.jsx).
    const tl = gsap.timeline({ delay: 0.5, paused: true });
    introRef.current = tl;

    tl.to(
        [gridRef.current, textureRef.current, gradientRef.current],
        { autoAlpha: 1, duration: 0.6, ease: "power1.out" },
        0.5,
      )
      .to(
        lineRef.current,
        { autoAlpha: 1, x: window.innerWidth * 1.5, ease: "none", duration: 1 },
        "-=0.3",
      )
      .to(
        line1Ref.current,
        { autoAlpha: 1, y: window.innerHeight * 1.5, ease: "none", duration: 1 },
        "<",
      )
      .to(
        dvm_textRef.current,
        { clipPath: "inset(0 0% 0 0)", webkitClipPath: "inset(0 0% 0 0)", ease: "none", duration: 1 },
        "<",
      )
      .from(dvm_Ref.current, { x: -100, opacity: 0 })
      .from(code_ref.current.children, { x: -100, opacity: 0, duration: 0.6, stagger: 0.2 })
      .from(about_ref.current, { x: 100, opacity: 0, duration: 0.3, stagger: 0.3 });

    return () => {
      introRef.current = null;
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (!revealed || !introRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) introRef.current.progress(1);
    else introRef.current.play();
  }, [revealed]);

  // If we navigated here from another page wanting to land on a specific
  // section (e.g. the hamburger menu's "about" link), scroll to it once
  // this page has mounted.
  useEffect(() => {
    if (location.state?.scrollTo) {
      const id = location.state.scrollTo;
      const el = document.getElementById(id);
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "smooth" });
        });
      }
    }
  }, [location.state]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} id="hero-container" className={styles.container}>
        <div ref={gridRef} className={styles.grid}></div>
        <div style={{ backgroundImage: `url(${bg3})` }} ref={textureRef} className={styles.texture}></div>

        <img className={styles.dvm_text} src={dvm_text} ref={dvm_textRef} alt="dvm_text" />
        <div ref={lineRef} className={styles.line}></div>
        <div ref={line1Ref} className={styles.line1}></div>

        <div className={styles.text} ref={dvm_Ref}>
          <div>DEPARTMENT OF</div>
          <div className={styles.visualMedia}>VISUAL MEDIA</div>
        </div>
        <div className={styles.text_sub} ref={code_ref}>
          <div>CODE.</div>
          <div>DESIGN.</div>
          <div>ANIMATE.</div>
        </div>

        <div ref={gradientRef} className={styles.gradient}></div>
      </div>

      <div id="about">
        <AboutPage />
      </div>

      <Logo triggerSelector="#hero-container" heroRef={containerRef} mercRef={mercRef} backdrop={backdrop} />
    </div>
  );
};

export default HomePage;