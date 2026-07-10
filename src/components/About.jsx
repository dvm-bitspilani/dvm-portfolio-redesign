import styles from "./About.module.css";
import about from "../assests/about_main.png";
import about_outline from "../assests/about_outline.png";
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
  const dvmRef = useRef(null);
  const btnRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    const updateMask = () => {
      if (!textureRef.current) return;
      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.1;
      const centerY = y + window.innerHeight * 0.28;

      const mask = `radial-gradient(circle 50vh at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
    };
    updateMask(); // Initial call to set the mask
    gsap.to(gradientPos.current, {
      x: window.innerWidth * 0.4,
      y: window.innerHeight * 1,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 50%",
        end: "bottom -100%",
        scrub: 1,
      },
      onUpdate: updateMask,
    });
  }, []);
  useEffect(() => {
    gsap.to(gradientRef.current, {
      x: window.innerWidth * 0.4,
      y: window.innerHeight * 1,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 10%",
        end: "bottom -100%",
        scrub: 1,
      },
    });
  }, []);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    gsap.from(dvmRef.current.children, {
      x: -100,
      y: 20,
      rotate: -30,
      opacity: 0,
      duration: 1,
      stagger: 0.4,
      scrollTrigger: {
        trigger: footerRef.current,
        start: "top 85%",
        end: "top",
      },
    });
  }, []);

  useEffect(() => {
    gsap.from(btnRef.current, {
      x: 100,
      opacity: 0,
      duration: 1,

      scrollTrigger: {
        trigger: footerRef.current,
        start: "top 85%",
        end: "top",
      },
    });
  }, []);

  useEffect(() => {
    const refs = [paraRef, para1Ref, para2Ref];

    const splits = refs.map(
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
      tl.from(
        split.words,
        {
          opacity: 0,

          rotate: 20,
          y: 20,
          duration: 0.1,
          stagger: 0.04,
          ease: "power2.out",
         
        },
      );
    });

    return () => {
      splits.forEach((split) => split.revert());
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.grid}></div>
      <div
        style={{ backgroundImage: `url(${bg3})` }}
        ref={textureRef}
        className={styles.texture}
      ></div>

      
      <img ref={about_ref} className={styles.image} src={about} alt="about" />
      <img ref={about_outlineRef} className={styles.image1} src={about_outline} alt="about" />

      <p ref={paraRef} className={styles.para}>
        The Department of Visual Media plays an instrumental role in building
        the software that is the backbone of all the three fests of BITS Pilani
        - Oasis and APOGEE.
      </p>
      <p ref={para1Ref} className={styles.para1}>
        DVM is responsible for creating and maintaining the Websites,
        Applications (iOS & Android), Teasers, Trailers & Promotional Videos of
        the three fests.
      </p>
      <p ref={para2Ref} className={styles.para2}>
        Despite generating traffic of over 5000 users on our apps and websites,
        we handle everything with ease.
      </p>

      <div ref={footerRef} className={styles.footer}>
        <div ref={dvmRef} className={styles.text}>
          <div>DEPARTMENT OF</div>
          <div className={styles.visualMedia}>VISUAL MEDIA</div>
        </div>
        <div ref={btnRef} className={styles.project}>
          PROJECTS
        </div>
      </div>

      <div ref={gradientRef} className={styles.gradient}></div>
    </div>
  );
};

export default About;
