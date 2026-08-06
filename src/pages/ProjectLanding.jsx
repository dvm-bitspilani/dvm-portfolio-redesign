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
    const updateMask = () => {
      if (!textureRef.current) return;
      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.1;
      const centerY = y + window.innerHeight * 0.28;

      const mask = `radial-gradient(circle 50vh at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
    };

    updateMask();

    const ctx = gsap.context(() => {
      // Move the invisible "spotlight" center as the user scrolls
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

      // Move the color-blend gradient overlay in sync
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

  // Word-by-word paragraph reveal, re-run whenever the card changes
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