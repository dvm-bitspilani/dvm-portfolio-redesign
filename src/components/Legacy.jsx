import { useRef, useState, useEffect } from "react";
import styles from "./Legacy.module.css";
import header from "../assests/Legacy/header.svg";
import header_fill from "../assests/Legacy/header_fill.svg";
import arrow from "../assests/Legacy/arrow.png";
import LegacyCircle from "./LegacyCircle";
import LegacyCard from "./LegacyCard";
import google from "../assests/Legacy/google.png";
import microsoft from "../assests/Legacy/microsoft.png";
import meta from "../assests/Legacy/meta.png";
import imc from "../assests/Legacy/imc.png";
import bg3 from "../assests/bg_3.png";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

// If your circles are a fixed pixel size, set it here instead of measuring.
// Set to null to fall back to measuring each ref's bounding box.
const FIXED_CIRCLE_RADIUS = null;

const Legacy = () => {
  let x = window.innerWidth > 1420 ? window.innerWidth * 0.8 : window.innerWidth * 0.8;
  x = window.innerWidth < 1024 ? window.innerWidth * 0.3 : window.innerWidth * 0.4;
  x = window.innerWidth < 900 ? window.innerWidth * 0.2  : window.innerWidth * 0.4;
  const containerRef = useRef(null);
  const textureRef = useRef(null);
  const gradientRef = useRef(null);
  const wrapperRef = useRef(null);
  const googleRef = useRef(null);
  const microsoftRef = useRef(null);
  const metaRef = useRef(null);
  const imcRef = useRef(null);
  const img1Ref = useRef(null);
  const img2Ref = useRef(null);
  const img3Ref = useRef(null);
  const headerRef = useRef(null);
  const headerFillRef = useRef(null);
  const footerRef = useRef(null);
  const footerConRef = useRef(null);
  const footerBtnRef = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });
  const lineRefs = useRef([]);

  // key -> DOM node, used only to measure position for the overlay
  const circleDomRefs = useRef({});

  const [centers, setCenters] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);

  // Which card is open, and where/how big the shared overlay should be
  const [openKey, setOpenKey] = useState(null);
  const [overlayPos, setOverlayPos] = useState({
    left: 0,
    top: 0,
    anchor: "left",
    width: 0,
  });

  // Returns the center x/y (and radius) of `el`, relative to `wrapperRef.current`
  const getCenter = (el) => {
    if (!el || !wrapperRef.current) return null;

    const rect = el.getBoundingClientRect();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();

    return {
      x: rect.left + rect.width / 2 - wrapperRect.left,
      y: rect.top + rect.height / 2 - wrapperRect.top,
      r: FIXED_CIRCLE_RADIUS ?? rect.width / 2,
    };
  };

  // Positions + sizes the single shared overlay based on the clicked
  // circle's real on-screen center.
  // - width is a fixed px value (computed once here) so every card is
  //   identical, regardless of its own content.
  // - if the circle is in the right half of the screen, the overlay
  //   opens to its LEFT instead of the right, so it never covers the circle.
  const positionOverlay = (key) => {
    const el = circleDomRefs.current[key];
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const circleCenterX = rect.left + rect.width / 2;
    const circleCenterY = rect.top + rect.height / 2;

    const overlayWidth = Math.min(600, window.innerWidth * 0.9);
    const overlayHeight = Math.min(window.innerHeight * 0.8, 500);
    const margin = 16;
    const gap = 24; // space between the circle and the card when placed beside it

    const isRightHalf = circleCenterX > window.innerWidth / 2;

    let left;
    let anchor; // "left" = `left` is the card's left edge, "right" = `left` is the card's right edge

    if (isRightHalf) {
      left = circleCenterX - gap;
      anchor = "right";
    } else {
      left = circleCenterX + gap;
      anchor = "left";
    }

    // Clamp horizontally so the card never runs off either screen edge
    if (anchor === "right") {
      left = Math.min(
        Math.max(left, overlayWidth + margin),
        window.innerWidth - margin
      );
    } else {
      left = Math.min(
        Math.max(left, margin),
        window.innerWidth - overlayWidth - margin
      );
    }
    
    // Vertically center on the circle, clamped to viewport
    let top = circleCenterY - overlayHeight / 2;
    top = Math.min(
      Math.max(top, margin),
      window.innerHeight - overlayHeight - margin
    );

    setOverlayPos({ left, top, anchor, width: overlayWidth });
  };

  const toggleKey = (key) => {
    setOpenKey((prev) => {
      const next = prev === key ? null : key;
      if (next) requestAnimationFrame(() => positionOverlay(next));
      return next;
    });
  };

  const closeOverlay = () => setOpenKey(null);

  // Reposition the open card on resize
  useEffect(() => {
    if (!openKey) return;
    const onResize = () => positionOverlay(openKey);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [openKey]);

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
    gsap.from(headerRef.current, {
      y: -100,
      x: 100,
      opacity: 0,
      duration: 1,
      scrollTrigger: {
        trigger: headerRef.current,
        start: "top 85%",
        end: "top",
      },
    });
  }, []);

  useEffect(() => {
    gsap.from(headerFillRef.current, {
      y: 100,
      x: -100,
      opacity: 0,
      duration: 1,
      scrollTrigger: {
        trigger: headerRef.current,
        start: "top 85%",
        end: "top",
      },
    });
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 10%",
        end: "top",
      },
    });

    tl.from(footerConRef.current.children, {
      x: -100,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
    }).from(footerBtnRef.current.children, {
      x: 100,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  // Circles appear one by one, then lines draw in to connect them
  useEffect(() => {
    if (!centers) return; // wait until circle positions (and <line> elements) exist

    const circleOrder = [
      googleRef.current,
      microsoftRef.current,
      metaRef.current,
      imcRef.current,
      img1Ref.current,
      img2Ref.current,
      img3Ref.current,
    ].filter(Boolean);

    const validLines = lineRefs.current.filter(Boolean);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapperRef.current,
        start: "top 96%",
        end: "top 20%",
        toggleActions: "play none none reverse",
      },
    });

    tl.set(circleOrder, { opacity: 0, scale: 0.5, transformOrigin: "center center" })
      .set(validLines, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 })
      .to(circleOrder, {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        stagger: 0.15,
        ease: "back.out(1.7)",
      })
      .to(
        validLines,
        {
          opacity: 1,
          strokeDashoffset: 0,
          duration: 0.7,
          stagger: 0.05,
          ease: "power2.out",
        },
        "-=0.15" // start lines slightly before the last circle finishes
      )
      .set(validLines, { strokeDasharray: "0.02 0.015" }) // switch to dashed once fully drawn
      .set(circleOrder, { clearProps: "opacity,scale" })
      .set(validLines, { clearProps: "opacity" });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [centers]);

  useEffect(() => {
    const calculate = () => {
      setCenters({
        google: getCenter(googleRef.current),
        microsoft: getCenter(microsoftRef.current),
        meta: getCenter(metaRef.current),
        imc: getCenter(imcRef.current),
        img1: getCenter(img1Ref.current),
        img2: getCenter(img2Ref.current),
        img3: getCenter(img3Ref.current),
      });
    };

    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  // All connecting pairs between circles (by key, resolved to coords at render time)
  const pairs = centers
    ? [
        ["google", "microsoft"],
        ["google", "meta"],
        ["google", "imc"],
        ["microsoft", "meta"],
        ["microsoft", "img3"],
        ["meta", "imc"],
        ["imc", "img2"],
        ["imc", "img3"],
        ["imc", "img1"],
        ["img2", "img1"],
        ["google", "img2"],
        ["microsoft", "imc"],
        ["img1", "img3"],
        ["img2", "img3"],
      ]
    : [];

  const circleList = [
    { key: "google", ref: googleRef, className: styles.google, img: google },
    {
      key: "microsoft",
      ref: microsoftRef,
      className: styles.microsoft,
      img: microsoft,
    },
    { key: "meta", ref: metaRef, className: styles.meta, img: meta },
    { key: "imc", ref: imcRef, className: styles.imc, img: imc },
    { key: "img1", ref: img1Ref, className: styles.img1, img: imc },
    { key: "img2", ref: img2Ref, className: styles.img2, img: google },
    { key: "img3", ref: img3Ref, className: styles.img3, img: meta },
  ];

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.grid}></div>
      <div
        style={{ backgroundImage: `url(${bg3})` }}
        ref={textureRef}
        className={styles.texture}
      ></div>

      <div className={styles.header}>
        <img
          src={header}
          alt="Header"
          ref={headerRef}
          className={styles.headerOuterImage}
        />
        <img
          src={header_fill}
          alt="Header"
          ref={headerFillRef}
          className={styles.headerImage}
        />
      </div>

      <div className={styles.circleWrapper} ref={wrapperRef}>
        <svg
          className={styles.lineSvg}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <defs>
            <linearGradient
              id="hoverGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#4facfe" />
              <stop offset="100%" stopColor="#00c6ff" />
            </linearGradient>

            {centers && (
              <mask
                id="circleMask"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="100%"
                height="100%"
              >
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {circleList.map(({ key }) => {
                  const c = centers[key];
                  if (!c) return null;
                  return (
                    <circle key={key} cx={c.x} cy={c.y} r={c.r} fill="black" />
                  );
                })}
              </mask>
            )}
          </defs>

          <g mask={centers ? "url(#circleMask)" : undefined}>
            {pairs.map(([fromKey, toKey], i) => {
              let from = centers[fromKey];
              let to = centers[toKey];
              const isHighlighted =
                hoveredKey &&
                (hoveredKey === fromKey || hoveredKey === toKey);
              const isDimmed = hoveredKey && !isHighlighted;

              if (!from || !to) return null;

              if (isHighlighted && hoveredKey === toKey) {
                const temp = from;
                from = to;
                to = temp;
              }

              return (
                <g key={i}>
                  <line
                    ref={(el) => (lineRefs.current[i] = el)}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    pathLength="1"
                    strokeDasharray="1"
                    strokeDashoffset="1"
                    className={`${styles.baseLine} ${
                      isDimmed ? styles.dimmed : ""
                    }`}
                  />

                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    pathLength="1"
                    className={`${styles.overlayLine} ${
                      isHighlighted ? styles.active : ""
                    }`}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {circleList.map(({ key, ref, className, img }) => {
          const isDimmedCircle = hoveredKey && hoveredKey !== key;
          return (
            <div
              key={key}
              ref={(el) => {
                ref.current = el;
                circleDomRefs.current[key] = el;
              }}
              className={`${className} ${styles.circleBase} ${
                isDimmedCircle ? styles.circleDimmed : ""
              }`}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              onClick={() => toggleKey(key)}
            >
              <LegacyCircle img={img} />
            </div>
          );
        })}
      </div>

      {/* Single shared overlay for every circle. It never lives inside a
          circle's own positioning box, so opening it can't shift that box,
          and its width is fixed in px from JS so every card is identical. */}
      {openKey && (
        <div className={styles.backdrop} onClick={closeOverlay}>
          <div
            className={`${styles.overlay} ${
              overlayPos.anchor === "right"
                ? styles.anchorRight
                : styles.anchorLeft
            }`}
            style={{
              left: overlayPos.left,
              top: overlayPos.top,
              width: overlayPos.width,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <LegacyCard onClose={closeOverlay} />
          </div>
        </div>
      )}

      <div ref={footerRef} className={styles.footer}>
        <div className={styles.footerContent} ref={footerConRef}>
          <h2>DEPARTMENT OF</h2>
          <h1 className={styles.vm}>VISUAL MEDIA</h1>
        </div>
        <div ref={footerBtnRef} className={styles.footerActions}>
          <button className={styles.footerButton}>ARTWORKS</button>
          <img className={styles.arrow} src={arrow} alt="Arrow" />
        </div>
      </div>
      <div ref={gradientRef} className={styles.gradient}></div>
    </div>
  );
};

export default Legacy;