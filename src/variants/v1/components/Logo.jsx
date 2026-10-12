import styles from "./Logo.module.css";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { MercuryLogo } from "../../../immersive/kit/mercury";
import { useBoot } from "../boot";

gsap.registerPlugin(ScrollTrigger);

const BASE_YAW = 0.08;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Sizes the mercury mark like the old paper logo (`.logo` heights per
 * breakpoint in Logo.module.css), measured against the base screenshots.
 */
function fitFor(width) {
  if (width <= 480) return { mode: "height", padding: 0.41, x: 0.01, y: -0.03 };
  if (width <= 768) return { mode: "height", padding: 0.34, x: 0.01, y: -0.01 };
  if (width <= 1024) return { mode: "height", padding: 0.26, x: 0.02, y: 0.02 };
  return { mode: "height", padding: 0.225, x: 0.02, y: 0.025 };
}

function useFit() {
  const [fit, setFit] = useState(() => fitFor(window.innerWidth));
  useEffect(() => {
    const on = () => {
      const next = fitFor(window.innerWidth);
      setFit((f) => (f.padding === next.padding ? f : next));
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return fit;
}

/**
 * The hero logo, same pin / scale / move choreography as the base Logo.jsx,
 * with the paper image replaced by the live mercury mark:
 *  - the scroll spin (rotateY) now turns the metal itself via setRotation,
 *    so it relights as it spins;
 *  - scrolling the hero away takes the material from chrome to glass;
 *  - cursor droplets / click beads come from the hero (pointerTarget).
 */
const Logo = ({ triggerSelector = "#hero-container", heroRef, mercRef, backdrop }) => {
  const x_move = window.innerWidth > 768 ? -window.innerWidth * 0.4 : window.innerWidth * 0.3;
  const logoRef = useRef(null);
  const logoFloatRef = useRef(null);
  const floatTweenRef = useRef(null);
  const isScrolledRef = useRef(false);
  const introPlayed = useRef(false);
  const { revealed } = useBoot();
  const revealedAtMount = useRef(revealed);
  const fit = useFit();

  // Hidden until the boot hands off; then the beads fall into the mark.
  useEffect(() => {
    const float = logoFloatRef.current;
    if (!introPlayed.current) gsap.set(float, { autoAlpha: 0 });

    const floatTween = gsap.to(float, {
      y: 10,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut",
      paused: true,
    });
    floatTweenRef.current = floatTween;

    const floatScrollTrigger = ScrollTrigger.create({
      trigger: triggerSelector,
      start: "top top",
      end: "bottom -100%",
      onUpdate: (self) => {
        if (!introPlayed.current) return;
        if (self.progress > 0.001 && !floatTween.paused()) {
          floatTween.pause();
          gsap.set(float, { y: 0 });
        } else if (self.progress <= 0.001 && floatTween.paused() && !reducedMotion()) {
          floatTween.play();
        }
      },
    });

    return () => {
      floatTween.kill();
      floatScrollTrigger.kill();
    };
  }, [triggerSelector]);

  useEffect(() => {
    if (!revealed || introPlayed.current) return;
    introPlayed.current = true;
    const float = logoFloatRef.current;
    const reduced = reducedMotion();
    // Boot just powered off (fresh load) → beads right away; arriving later
    // from another page → wait for the letters' clip reveal like the base.
    const delay = revealedAtMount.current ? 0.9 : 0.15;
    gsap.set(float, { autoAlpha: 1 });
    if (!reduced) {
      mercRef.current?.playIntro(delay);
      const id = window.setTimeout(() => {
        if (window.scrollY < 2) floatTweenRef.current?.play();
      }, (delay + 1.4) * 1000);
      return () => window.clearTimeout(id);
    }
  }, [revealed, mercRef]);

  // Move / spin / scale as the user scrolls Home → through About (base timing).
  useEffect(() => {
    const el = logoRef.current;
    const isMobile = window.innerWidth <= 768;
    const spin = { t: 0 };

    gsap.set(el, { xPercent: 0, y: 0, rotateZ: 0, scale: 1, autoAlpha: 1, transformPerspective: 1200 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerSelector,
        start: "top%",
        endTrigger: "#about-container",
        end: "bottom bottom",
        scrub: 3,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          isScrolledRef.current = self.progress > 0.001;
        },
      },
      onComplete: () => gsap.set(el, { zIndex: isMobile ? -10 : 2 }),
      onReverseComplete: () => gsap.set(el, { zIndex: 1000 }),
    });
    tl.to(el, { scale: 0.3, rotateZ: 360, x: () => x_move, ease: "none", duration: 1 }, 0).to(
      spin,
      {
        t: 1,
        ease: "none",
        duration: 1,
        onUpdate: () => mercRef.current?.setRotation(BASE_YAW + spin.t * Math.PI * 2, undefined, true),
      },
      0,
    );

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());
    const handleLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", handleLoad);

    return () => {
      cancelAnimationFrame(refreshId);
      window.removeEventListener("load", handleLoad);
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
      gsap.set(el, { clearProps: "transform" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSelector]);

  // Chrome → glass as the hero scrolls away (the mercury eases toward it).
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: triggerSelector,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => mercRef.current?.setProgress(self.progress),
      onLeave: () => mercRef.current?.setProgress(1),
      onLeaveBack: () => mercRef.current?.setProgress(0),
    });
    return () => st.kill();
  }, [triggerSelector, mercRef]);

  useEffect(() => {
    const el = logoRef.current;
    const pinTrigger = ScrollTrigger.create({
      trigger: triggerSelector,
      start: "top top",
      endTrigger: "#about-container",
      end: window.innerWidth > 768 ? "25% top" : "35% top",
      pin: el,
      pinSpacing: false,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    });

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());
    const handleLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", handleLoad);

    let fontsCancelled = false;
    document.fonts?.ready.then(() => {
      if (!fontsCancelled) ScrollTrigger.refresh();
    });

    return () => {
      fontsCancelled = true;
      cancelAnimationFrame(refreshId);
      window.removeEventListener("load", handleLoad);
      pinTrigger.kill();
    };
  }, [triggerSelector]);

  return (
    <div ref={logoRef} className={styles.image_container}>
      <div ref={logoFloatRef} className={styles.logoFloatWrapper}>
        <div className={styles.mercury}>
          <MercuryLogo
            ref={mercRef}
            background="transparent"
            env="teal"
            intro={false}
            interactive
            pointerTarget={heroRef}
            backdrop={backdrop ? { source: backdrop, element: heroRef, frost: 0.9 } : null}
            fit={fit}
            label="DVM, Department of Visual Media"
          />
        </div>
      </div>
    </div>
  );
};

export default Logo;
