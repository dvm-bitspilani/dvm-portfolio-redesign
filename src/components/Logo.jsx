import styles from "./Logo.module.css";
import logo from "../assests/logo.png";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const Logo = ({ triggerSelector = "#hero-container" }) => {
  const x_move = window.innerWidth > 768 ? -window.innerWidth * 0.4 : 0;
  const logoRef = useRef(null);
  const logoFloatRef = useRef(null);
  const logoSvg1Ref = useRef(null);
  const logoSvg2Ref = useRef(null);
  const logoImgRef = useRef(null);
  const logoPath1Ref = useRef(null);
  const logoPath2Ref = useRef(null);
  const logoFill1Ref = useRef(null);
  const logoFill2Ref = useRef(null);
  const logoClip1Ref = useRef(null);
  const logoClip2Ref = useRef(null);
  const isScrolledRef = useRef(false);

  useEffect(() => {
    const path1 = logoPath1Ref.current;
    const path2 = logoPath2Ref.current;
    const clip1 = logoClip1Ref.current;
    const clip2 = logoClip2Ref.current;
    if (!path1 || !path2 || !clip1 || !clip2) return;

    const length1 = path1.getTotalLength();
    const length2 = path2.getTotalLength();

    gsap.set(path1, { strokeDasharray: length1, strokeDashoffset: length1 });
    gsap.set(path2, { strokeDasharray: length2, strokeDashoffset: length2 });
    gsap.set(clip1, { attr: { height: 0 } });
    gsap.set(clip2, { attr: { height: 0 } });
    gsap.set(logoFloatRef.current, { scale: 1.35 });
    gsap.set(logoImgRef.current, { autoAlpha: 0 });

    const floatTween = gsap.to(logoFloatRef.current, {
      y: 10,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut",
      paused: true,
    });

    const tl = gsap.timeline({ delay: 0.1 });

    tl.to(path1, { strokeDashoffset: 0, ease: "none", duration: 0.8 }, 0)
      .to(path2, { strokeDashoffset: 0, ease: "none", duration: 0.8 }, 0.15)
      .to(
        logoFloatRef.current,
        { scale: 1, duration: 0.3, ease: "power3.inOut" },
        "-=0.35",
      )
      .to([logoSvg1Ref.current, logoSvg2Ref.current], {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power1.inOut",
      })
      .to(
        logoImgRef.current,
        { autoAlpha: 1, duration: 0.4, ease: "power1.inOut" },
        "<",
      )
      .add(() => floatTween.play());

    const floatScrollTrigger = ScrollTrigger.create({
      trigger: triggerSelector,
      start: "top top",
      end: "bottom -100%",
      onUpdate: (self) => {
        if (self.progress > 0.001 && !floatTween.paused()) {
          floatTween.pause();
          gsap.set(logoFloatRef.current, { y: 0 });
        } else if (self.progress <= 0.001 && floatTween.paused()) {
          floatTween.play();
        }
      },
    });

    return () => {
      tl.kill();
      floatTween.kill();
      floatScrollTrigger.kill();
    };
  }, [triggerSelector]);

  // Move/rotate/scale as user scrolls Home → all the way through About.
  useEffect(() => {
    const el = logoRef.current;

    gsap.set(el, {
      xPercent: 0,
      y: 0,
      rotateY: 0,
      scale: 1,
      autoAlpha: 1,
      transformPerspective: 1200,
    });

    const tween = gsap.to(el, {
      scale: 0.3,
      rotateY: 360,

      rotateZ: 360,
      x: x_move,
      ease: "none",
      scrollTrigger: {
        trigger: triggerSelector,
        start: "top%",
        endTrigger: "#about-container",
        end: "bottom bottom",
        scrub: 3,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const scrolled = self.progress > 0.001;
          if (scrolled !== isScrolledRef.current) {
            isScrolledRef.current = scrolled;
            if (scrolled) {
              gsap.set(el, { rotateX: 0 });
            }
          }
        },
      },
      onComplete: () => {
        gsap.set(el, { zIndex: 2 });
      },
      onReverseComplete: () => {
        gsap.set(el, { zIndex: 1000 });
      },
    });

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());
    const handleLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", handleLoad);

    return () => {
      cancelAnimationFrame(refreshId);
      window.removeEventListener("load", handleLoad);
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
      gsap.set(el, {
        xPercent: 0,
        y: 0,
        rotateY: 0,
        scale: 1,
        autoAlpha: 1,
        clearProps: "transform",
      });
    };
  }, [triggerSelector]);

  useEffect(() => {
    const el = logoRef.current;

    const pinTrigger = ScrollTrigger.create({
      trigger: triggerSelector,
      start: "top top",
      endTrigger: "#about-container",
      end: "25% top",
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

  useEffect(() => {
    const logoEl = logoRef.current;
    if (!logoEl) return;

    const clamp = gsap.utils.clamp(-6, 6);

    const handleMouseMove = (e) => {
      if (isScrolledRef.current) return;

      const rect = logoEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) / rect.width;
      const deltaY = (e.clientY - centerY) / rect.height;

      gsap.to(logoEl, {
        rotateY: clamp(deltaX * 8),
        rotateX: clamp(-deltaY * 6),
        transformPerspective: 800,
        duration: 0.5,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      if (isScrolledRef.current) return;
      gsap.to(logoEl, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.6,
        ease: "power3.out",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div ref={logoRef} className={styles.image_container}>
      <div ref={logoFloatRef} className={styles.logoFloatWrapper}>
        <svg
          ref={logoSvg1Ref}
          className={styles.logo}
          width="515"
          height="660"
          viewBox="0 0 515 660"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="logoClip1" clipPathUnits="userSpaceOnUse">
              <rect ref={logoClip1Ref} x="0" y="0" width="515" height="0" />
            </clipPath>
          </defs>
          <path
            ref={logoFill1Ref}
            d="M514.363 0L449.662 46.9073V400.33L211.083 583.915L0 432.68V507.892L211.083 659.936L514.363 423.783V0Z"
            fill="#ECECEC"
            clipPath="url(#logoClip1)"
          />
          <path
            ref={logoPath1Ref}
            d="M514.363 0L449.662 46.9073V400.33L211.083 583.915L0 432.68V507.892L211.083 659.936L514.363 423.783V0Z"
            fill="none"
            stroke="#ECECEC"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          ref={logoSvg2Ref}
          className={styles.logo1}
          width="407"
          height="456"
          viewBox="0 0 407 456"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="logoClip2" clipPathUnits="userSpaceOnUse">
              <rect ref={logoClip2Ref} x="0" y="0" width="407" height="0" />
            </clipPath>
          </defs>
          <path
            ref={logoFill2Ref}
            d="M406.771 0L211.842 152.787L106.325 78.415V142.278L211.842 221.502L354.413 109.942V276.472L211.842 384.799L62.0224 276.472V45.2704L0 0V304.766L211.842 455.129L406.771 304.766V0Z"
            fill="#ECECEC"
            clipPath="url(#logoClip2)"
          />
          <path
            ref={logoPath2Ref}
            d="M406.771 0L211.842 152.787L106.325 78.415V142.278L211.842 221.502L354.413 109.942V276.472L211.842 384.799L62.0224 276.472V45.2704L0 0V304.766L211.842 455.129L406.771 304.766V0Z"
            fill="none"
            stroke="#ECECEC"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>

        <img ref={logoImgRef} src={logo} className={styles.logo} alt="logo" />
      </div>
    </div>
  );
};

export default Logo;