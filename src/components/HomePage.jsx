import styles from "./HomePage.module.css";
import dvm_text from "../assests/image.png";
import About from "./About";
import logo from "../assests/logo.png";
import bg3 from "../assests/bg_3.png";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";

gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
  const textureRef = useRef(null);
  const gradientRef = useRef(null);
  const containerRef = useRef(null);
  const gridRef = useRef(null);
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
  const dvm_Ref = useRef(null);
  const dvm_textRef = useRef(null);
  const code_ref = useRef(null);
  const about_ref = useRef(null);
  const lineRef = useRef(null);
  const line1Ref = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
  const updateMask = () => {
    if (!textureRef.current) return;

    const { x, y } = gradientPos.current;
    const centerX = x + window.innerWidth * 0.6;
    const centerY = y + window.innerHeight * 0.2;

    const mask = `radial-gradient(circle 40vw at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;

    textureRef.current.style.webkitMaskImage = mask;
    textureRef.current.style.maskImage = mask;
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
    gsap.set(dvm_textRef.current, {
      clipPath: "inset(0 100% 0 0)",
      webkitClipPath: "inset(0 100% 0 0)",
    });
    gsap.set(
      [
        gridRef.current,
        textureRef.current,
        gradientRef.current,
        lineRef.current,
        line1Ref.current,
      ],
      { autoAlpha: 0 },
    );

    const floatTween = gsap.to(logoFloatRef.current, {
      y: 10,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut",
      paused: true,
    });

    const tl = gsap.timeline({ delay: 0.3 });

    tl.to(path1, { strokeDashoffset: 0, ease: "none", duration: 0.8 }, 0)
      .to(path2, { strokeDashoffset: 0, ease: "none", duration: 0.8 }, 0.15)
      .to(
        logoFloatRef.current,
        { scale: 1, duration: 0.7, ease: "power3.inOut" },
        "-=0.35",
      )
      .to(
        [logoSvg1Ref.current, logoSvg2Ref.current],
        { autoAlpha: 0, duration: 0.4, ease: "power1.inOut" },
      )
      .to(
        logoImgRef.current,
        { autoAlpha: 1, duration: 0.4, ease: "power1.inOut" },
        "<",
      )
      .to(
        [gridRef.current, textureRef.current, gradientRef.current],
        { autoAlpha: 1, duration: 0.6, ease: "power1.out" },
        "-=0.3",
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
        {
          clipPath: "inset(0 0% 0 0)",
          webkitClipPath: "inset(0 0% 0 0)",
          ease: "none",
          duration: 1,
        },
        "<",
      )
      .add(() => floatTween.play())
      .from(dvm_Ref.current, {
        x: -100,
        opacity: 0,
      })
      .from(code_ref.current.children, {
        x: 100,
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
      })
      .from(about_ref.current, {
        x: -100,
        y: 20,
        opacity: 0,
        duration: 0.3,
        stagger: 0.3,
      });

    const floatScrollTrigger = ScrollTrigger.create({
      trigger: containerRef.current,
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
  }, []);

  useEffect(() => {
    gsap.set(logoRef.current, { scale: 1, y: 0 });

    const tween = gsap.to(logoRef.current, {
      scale: 0,
      y: window.innerHeight,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 10%",
        end: "bottom -100%",
        scrub: true,
      },
    });

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(refreshId);
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
      gsap.set(logoRef.current, { scale: 1, y: 0, clearProps: "transform" });
    };
  }, []);

  useEffect(() => {
    const logoEl = logoRef.current;
    if (!logoEl) return;

    const clamp = gsap.utils.clamp(-6, 6);

    const handleMouseMove = (e) => {
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
    <>
      <div ref={containerRef} className={styles.container}>
        <div ref={gridRef} className={styles.grid}></div>
        <div
          style={{ backgroundImage: `url(${bg3})` }}
          ref={textureRef}
          className={styles.texture}
        ></div>

        <img
          className={styles.dvm_text}
          src={dvm_text}
          ref={dvm_textRef}
          alt="dvm_text"
        />
        <div ref={lineRef} className={styles.line}></div>
        <div ref={line1Ref} className={styles.line1}></div>
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

            <img
              ref={logoImgRef}
              src={logo}
              className={styles.logo}
              alt="logo"
            />
          </div>
        </div>

        <div className={styles.text} ref={dvm_Ref}>
          <div>DEPARTMENT OF</div>
          <div className={styles.visualMedia}>VISUAL MEDIA</div>
        </div>
        <div className={styles.text_sub} ref={code_ref}>
          <div>CODE.</div>
          <div>DESIGN.</div>
          <div>ANIMATE.</div>
        </div>
        <button ref={about_ref} className={styles.about}>
          ABOUT US
        </button>
        <div ref={gradientRef} className={styles.gradient}></div>
      </div>
    </>
  );
};

export default HomePage;
