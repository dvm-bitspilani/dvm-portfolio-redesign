import styles from "./About.module.css";
import { SplitText } from "gsap/SplitText";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import bg3 from "../assests/bg_3.png";

gsap.registerPlugin(ScrollTrigger, SplitText);

const About = () => {
  const textureRef = useRef(null);
  const gradientRef = useRef(null);
  const containerRef = useRef(null);
  const about_outlineRef = useRef(null);
  const about_ref = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });
  const paraRef = useRef(null);
  const para1Ref = useRef(null);
  const para2Ref = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    const updateMask = () => {
      if (!textureRef.current) return;
      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.09;
      const centerY = y + window.innerHeight * 0.25;

      const mask = `radial-gradient(circle 40vw at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
    };

    updateMask();

    const ctx = gsap.context(() => {
      gsap.to(gradientPos.current, {
        x: window.innerWidth * 1.5,
        y: window.innerHeight * 1.5,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 50%",
          end: "bottom -100%",
          scrub: 1,
        },
        onUpdate: updateMask,
      });
      gsap.to([textureRef.current, gradientRef.current], {
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 70%",
          end: "top 25%",
          scrub: true,
        },
      });
      gsap.to(gradientRef.current, {
        x: window.innerWidth * 1.5,
        y: window.innerHeight * 1.5,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 10%",
          end: "bottom -100%",
          scrub: 1,
        },
      });

      gsap.from(about_ref.current, {
        y: 100,
        x: -100,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: about_ref.current,
          start: "top 85%",
          end: "top",
        },
      });

      gsap.from(about_outlineRef.current, {
        y: -100,
        x: 100,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: about_ref.current,
          start: "top 85%",
          end: "top",
        },
      });


      const refs = [paraRef, para1Ref, para2Ref];
      const splits = refs
        .filter((r) => r.current)
        .map(
          (ref) =>
            new SplitText(ref.current, {
              type: "words",
            }),
        );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: paraRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      splits.forEach((split) => {
        tl.from(split.words, {
          opacity: 0,
          rotate: 20,
          y: 20,
          duration: 0.1,
          stagger: 0.04,
          ease: "power2.out",
        });
      });

      // --- Pin the section for ~1 second once fully scrolled into view ---
      let isLocked = false;

      const lockScrollFor = (ms) => {
        if (isLocked) return;
        isLocked = true;

        const preventScroll = (e) => e.preventDefault();
        window.addEventListener("wheel", preventScroll, { passive: false });
        window.addEventListener("touchmove", preventScroll, {
          passive: false,
        });

        const blockKeys = (e) => {
          const keys = [
            "ArrowUp",
            "ArrowDown",
            "PageUp",
            "PageDown",
            " ",
            "Home",
            "End",
          ];
          if (keys.includes(e.key)) e.preventDefault();
        };
        window.addEventListener("keydown", blockKeys, { passive: false });

        setTimeout(() => {
          window.removeEventListener("wheel", preventScroll);
          window.removeEventListener("touchmove", preventScroll);
          window.removeEventListener("keydown", blockKeys);
          isLocked = false;
        }, ms);
      };

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top", // fires once the section fully reaches the top of viewport
        onEnter: () => lockScrollFor(500),
        onEnterBack: () => lockScrollFor(500), // also lock when scrolling back up into it
      });
      // --- end pin effect ---
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div id="about-container" ref={containerRef} className={styles.container}>
      <div className={styles.grid}></div>
      <div
        style={{ backgroundImage: `url(${bg3})` }}
        ref={textureRef}
        className={styles.texture}
      ></div>

      <div className={styles.head}>
        <div className={styles.titleWrapper}>
          <div ref={about_ref} className={styles.image}>
            ABOUT US
          </div>

          <div ref={about_outlineRef} className={styles.image1}>
            ABOUT US
          </div>
        </div>
      </div>

      <div className={styles.paraGroup}>
        <p ref={paraRef} className={styles.paragraph}>
          The Department of Visual Media plays an instrumental role in building
          the software that is the backbone of all the three fests of BITS
          Pilani - Oasis and APOGEE.
        </p>
        <p ref={para1Ref} className={styles.paragraph}>
          DVM is responsible for creating and maintaining the Websites,
          Applications (iOS & Android), Teasers, Trailers & Promotional Videos
          of the three fests.
        </p>
        <p ref={para2Ref} className={styles.paragraph}>
          Despite generating traffic of over 5000 users on our apps and
          websites, we handle everything with ease.
        </p>
      </div>

      {/* <div ref={footerRef} className={styles.footer}>
        <div ref={dvmRef} className={styles.text}>
          <div>DEPARTMENT OF</div>
          <div className={styles.visualMedia}>VISUAL MEDIA</div>
        </div>
      </div> */}

      <div ref={gradientRef} className={styles.gradient}></div>
    </div>
  );
};

export default About;