import React, { useState, useRef, useEffect } from "react";
import "../components/ProjectLanding.css";
import bg3 from "../assests/bg_3.png";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const cards = [
  {
    name: "Project 1",
    image: "",
    paragraph:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    name: "Project 2",
    image: "",
    paragraph:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    name: "Project 3",
    image: "",
    paragraph:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
  {
    name: "Project 4",
    image: "",
    paragraph:
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
];

export default function ProjectLanding() {
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);
  const gradientRef = useRef(null);
  const textureRef = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });
  const headingRef = useRef(null);
  const cardRef = useRef(null);
  const paraRef = useRef(null);
  const seeAllRef = useRef(null);

  // Scroll-driven "bubble" reveal for the texture layer
  useEffect(() => {
    // CHANGE 1: give the spotlight/gradient a starting position instead of
    // the implicit (0, 0) top-left default. 0.5 puts it roughly mid-right;
    // the scroll tween below still carries it on to 0.8 * innerWidth, so
    // there's still room for rightward movement as the user scrolls.
    gradientPos.current = { x: window.innerWidth * 0.5, y: 0 };

    // CHANGE 2: snap the actual gradient DOM node to that same starting
    // transform immediately (no animation), so it visually matches
    // gradientPos.current before any scrolling has happened. Without this
    // the JS position value and the on-screen element would start out of
    // sync — gradientPos.current would say "0.5 * width" but the element
    // itself would still be sitting at its default (0, 0) transform.
    if (gradientRef.current) {
      gsap.set(gradientRef.current, { x: gradientPos.current.x, y: gradientPos.current.y });
    }

    const updateMask = () => {
      if (!textureRef.current) return;
      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.1;
      const centerY = y + window.innerHeight * 0.28;

      const mask = `radial-gradient(circle 50vh at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
    };

    // CHANGE 3: updateMask() now reads the new starting x/y from CHANGE 1,
    // so the mask bubble is correctly positioned on the right from the
    // very first paint, before any scroll event fires.
    updateMask();

    const ctx = gsap.context(() => {
      // Move the invisible "spotlight" center as the user scrolls.
      // This tween's start value is now whatever gradientPos.current
      // already is (0.5 * innerWidth, from CHANGE 1) instead of 0 — so the
      // sweep goes from "already on the right" to "further right" (0.8 *
      // innerWidth), rather than starting at the left edge and sweeping
      // across the whole screen.
      // Spotlight center: top-right → bottom-left
gsap.to(gradientPos.current, {
  x: -window.innerWidth * 0.1,   // center lands at x = 0 after the +0.1 offset
  y: window.innerHeight * 0.72,  // center lands at y = innerHeight after the +0.28 offset
  scrollTrigger: {
    trigger: containerRef.current,
    start: "top 50%",
    end: "bottom -100%",
    scrub: 1,
  },
  onUpdate: updateMask,
});

// Color-blend overlay follows the same path
gsap.to(gradientRef.current, {
  x: -window.innerWidth * 0.1,
  y: window.innerHeight * 0.72,
  scrollTrigger: {
    trigger: containerRef.current,
    start: "top 10%",
    end: "bottom -100%",
    scrub: 1,
  },
});
      // Heading entrance
      gsap.from(headingRef.current, {
        y: 100,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: headingRef.current,
          start: "top 85%",
          end: "top",
        },
      });

      // Carousel card entrance
      gsap.from(cardRef.current, {
        y: 80,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 85%",
          end: "top",
        },
      });

      // "See All Projects" button entrance
      gsap.from(seeAllRef.current, {
        y: 60,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: seeAllRef.current,
          start: "top 90%",
          end: "top",
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);


  useEffect(() => {
    if (!paraRef.current) return;

    const ctx = gsap.context(() => {
      const split = new SplitText(paraRef.current, { type: "words" });

      gsap.from(split.words, {
        opacity: 0,
        rotate: 20,
        y: 20,
        duration: 0.4,
        stagger: 0.03,
        ease: "power2.out",
      });

      return () => split.revert();
    });

    return () => ctx.revert();
  }, [index]);

  const goPrev = () => {
    setIndex((current) => (current - 1 + cards.length) % cards.length);
  };

  const goNext = () => {
    setIndex((current) => (current + 1) % cards.length);
  };

  const card = cards[index];

  return (
    <div ref={containerRef} className="project-landing">
      <div className="grid"></div>
      <div
        style={{ backgroundImage: `url(${bg3})` }}
        ref={textureRef}
        className="texture"
      ></div>

      <div className="project-landing-heading" ref={headingRef}>
        <h1>PROJECTS</h1>
      </div>

      <div className="project-carousel">
        <div className="project-carousel-card" ref={cardRef}>
          <div className="project-carousel-image">
            <img src={card.image} alt={card.name} />

            <button
              type="button"
              className="project-carousel-nav project-carousel-nav-left"
              onClick={goPrev}
            >
              ‹
            </button>

            <button
              type="button"
              className="project-carousel-nav project-carousel-nav-right"
              onClick={goNext}
            >
              ›
            </button>
          </div>

          <div className="project-carousel-content">
            <h3 className="project-carousel-name">{card.name}</h3>
            <p ref={paraRef} className="project-carousel-paragraph">
              {card.paragraph}
            </p>
          </div>
        </div>
      </div>

      <div className="see-all-container" ref={seeAllRef}>
        <Link to="/projects" className="see-all-projects">
          See All Projects
        </Link>
      </div>

      <div ref={gradientRef} className="gradient"></div>
    </div>
  );
}