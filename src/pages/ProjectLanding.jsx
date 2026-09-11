import { useState, useRef, useEffect } from "react";
import "../components/ProjectLanding.css";
import abc from "../assests/img/project-imgs/hero/apogee25-hero-min.png"
import bg3 from "../assests/bg_3.png";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import arrow from "../assests/arrow.png";


gsap.registerPlugin(ScrollTrigger, SplitText);

const cards = [
  {
    name: "APOGEE'25 ",
    image: abc,
    paragraph:
      " This was the Official Website of the 43rd edition of APOGEE'25, based on the theme Revved-Up Rhapsody. It streamlined the registration process for outside participants. The website featured an Events Page that listed all the events conducted during the fest, as well as numerous miscellaneous sections and pages, including Contact Us Page, Sponsors' & Media Partners Page, Speakers' Page, and many others."
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
  const headingOutlineRef = useRef(null);
  const cardRef = useRef(null);
  const paraRef = useRef(null);
  const seeAllRef = useRef(null);

  // Scroll-driven "bubble" reveal for the texture layer.
  // The sweep runs top-right -> bottom-left.
  useEffect(() => {
    // The mask center is offset from the raw x/y by (+0.1 * innerWidth,
    // +0.28 * innerHeight), so both the start and end values below are
    // pre-compensated for that offset. Starting here puts the visible
    // circle center at the top-right corner: (innerWidth, 0).
    gradientPos.current = {
      x: window.innerWidth * 0.9,
      y: -window.innerHeight * 0.28,
    };

    // Snap the gradient DOM node to the same starting transform (no
    // animation) so the element and gradientPos.current agree before any
    // scrolling happens.
    if (gradientRef.current) {
      gsap.set(gradientRef.current, {
        x: gradientPos.current.x,
        y: gradientPos.current.y,
      });
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

    // Paint the mask at its top-right start position before the first
    // scroll event fires.
    updateMask();

    const ctx = gsap.context(() => {
      // Spotlight center: top-right -> bottom-left.
      // Function-based values + invalidateOnRefresh so the corners are
      // recalculated on resize instead of frozen at mount-time viewport.
      gsap.to(gradientPos.current, {
        x: () => -window.innerWidth * 0.1, // center lands at x = 0
        y: () => window.innerHeight * 0.72, // center lands at y = innerHeight
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 50%",
          end: "bottom -100%",
          scrub: 1,
          invalidateOnRefresh: true,
        },
        onUpdate: updateMask,
      });

      // Color-blend overlay follows the same path.
      gsap.to(gradientRef.current, {
        x: () => -window.innerWidth * 0.1,
        y: () => window.innerHeight * 0.72,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 50%",
          end: "bottom -100%",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // Heading fill layer: drops in from the top-right.
      gsap.from(headingRef.current, {
        y: -100,
        x: 100,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: headingRef.current,
          start: "top 85%",
          end: "top",
        },
      });

      // Heading outline layer: rises in from the bottom-left.
      gsap.from(headingOutlineRef.current, {
        y: 100,
        x: -100,
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

      <div className="project-landing-heading">
        <div ref={headingRef} className="project-heading-fill" >
          PROJECTS
        </div>
        <div ref={headingOutlineRef} className="project-heading-outline">
          PROJECTS
        </div>
      </div>

      <div className="project-carousel">
        <div className="project-carousel-card" ref={cardRef}>
          <div className="project-carousel-image">
            <img src={card.image} alt={card.name}  />

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
    <span>See All Projects</span>
    <img src={arrow} alt="Arrow" className="projects-arrow" />
  </Link>
</div>

      <div ref={gradientRef} className="gradient"></div>
    </div>
  );
}