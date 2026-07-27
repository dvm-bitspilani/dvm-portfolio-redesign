import { useRef, useState, useEffect, useLayoutEffect } from "react";
import styles from "./Legacy.module.css";
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

// EDIT THESE with the real names for each company/branch.
const COMPANY_PEOPLE = {
  google: ["Person One", "Person Two", "Person Three", "Person Four"],
  microsoft: ["Person One", "Person Two", "Person Three"],
  meta: ["Person One", "Person Two", "Person Three"],
  imc: ["Person One", "Person Two", "Person Three"],
  img1: ["Person One", "Person Two", "Person Three"],
  img2: ["Person One", "Person Two", "Person Three"],
  img3: ["Person One", "Person Two", "Person Three"],
};

// Static — defined once, outside the component, so its reference never
// changes across renders (must not depend on state that re-renders on
// every hover/click, or the line effects will re-fire constantly).
const CONNECTION_PAIRS = [
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
];

// How long (ms) to wait after the mouse leaves a circle/label before
// collapsing the branch — gives the user time to move the cursor from
// the circle to one of its fanned-out names without it closing on them.
const CLOSE_DELAY =10;

// Computes where each person's branch should end. See previous version
// for the full reasoning — unchanged.
const computeBranchNodes = (key, center, wrapperSize) => {
  if (!center || !wrapperSize) return [];
  const people = COMPANY_PEOPLE[key] || [];
  const n = people.length;
  if (!n) return [];

  const margin = 28;
  const isRightHalf = center.x > wrapperSize.width / 2;
  const dirSign = isRightHalf ? -1 : 1;

  const availableVertical = Math.max(0, wrapperSize.height - margin * 2);
  let vSpread = 64;
  let totalSpread = (n - 1) * vSpread;
  if (totalSpread > availableVertical) {
    vSpread = n > 1 ? availableVertical / (n - 1) : 0;
    totalSpread = availableVertical;
  }

  const maxHorizontal = isRightHalf
    ? center.x - margin
    : wrapperSize.width - margin - center.x;
  const desiredHorizontal = Math.min(200, Math.max(100, wrapperSize.width * 0.13));
  const horizontal = Math.max(70, Math.min(desiredHorizontal, maxHorizontal));

  const bendFraction = 0.4;
  const minOffset = 18;

  return people.map((person, i) => {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;

    let rawOffset = t * totalSpread;
    if (Math.abs(rawOffset) < minOffset) {
      rawOffset = i % 2 === 0 ? minOffset : -minOffset;
    }

    let endY = center.y + rawOffset;
    endY = Math.min(Math.max(endY, margin), wrapperSize.height - margin);

    let endX = center.x + dirSign * horizontal;
    endX = Math.min(Math.max(endX, margin), wrapperSize.width - margin);

    let bendX = center.x + dirSign * horizontal * bendFraction;
    bendX = Math.min(Math.max(bendX, margin), wrapperSize.width - margin);
    const bendY = endY;

    return { person, x: endX, y: endY, bendX, bendY };
  });
};

const Legacy = () => {
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
  const gradientPos = useRef({ x: 0, y: 0 });

  // Refs to the connecting-graph lines (base + gradient overlay pair)
  const lineRefs = useRef([]);
  const overlayLineRefs = useRef([]);

  // key -> DOM node, used only to measure position for the overlay
  const circleDomRefs = useRef({});

  const branchLineRefs = useRef([]);
  const branchLabelRefs = useRef([]);

  // Pending "collapse the branch" timer.
  const closeTimeoutRef = useRef(null);

  const [centers, setCenters] = useState(null);
  const [wrapperSize, setWrapperSize] = useState(null);

  // Which circle is currently hovered — drives the connector-line
  // highlight/dim effect. Independent of branchKey/openKey.
  const [hoveredKey, setHoveredKey] = useState(null);

  const [branchKey, setBranchKey] = useState(null);
  const [closingBranch, setClosingBranch] = useState(false);

  const [openKey, setOpenKey] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [overlayPos, setOverlayPos] = useState({
    left: 0,
    top: 0,
    anchor: "left",
    width: 0,
  });

  const focusKey = branchKey || openKey;

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

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

  const positionOverlayFromRect = (rect) => {
    const circleCenterX = rect.left + rect.width / 2;
    const circleCenterY = rect.top + rect.height / 2;

    const overlayWidth = Math.min(600, window.innerWidth * 0.9);
    const overlayHeight = Math.min(window.innerHeight * 0.8, 500);
    const margin = 16;
    const gap = 24;

    const isRightHalf = circleCenterX > window.innerWidth / 2;

    let left;
    let anchor;

    if (isRightHalf) {
      left = circleCenterX - gap;
      anchor = "right";
    } else {
      left = circleCenterX + gap;
      anchor = "left";
    }

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

    let top = circleCenterY - overlayHeight / 2;
    top = Math.min(
      Math.max(top, margin),
      window.innerHeight - overlayHeight - margin
    );

    setOverlayPos({ left, top, anchor, width: overlayWidth });
  };

  // Opens (fans out) a company's branch on hover. Ignored while a card
  // is open, so a stray hover elsewhere doesn't yank the branch out from
  // under an open card.
  const openBranch = (key) => {
    if (openKey) return;
    clearCloseTimeout();
    if (branchKey === key) return;
    branchLineRefs.current = [];
    branchLabelRefs.current = [];
    setBranchKey(key);
  };

  // Click on a circle: toggle fallback for touch devices (no real hover).
  const handleCircleClick = (key) => {
    if (branchKey === key && !openKey) {
      closeAll();
    } else {
      openBranch(key);
    }
  };

  const scheduleCloseBranch = () => {
    if (openKey) return;
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      closeAll();
    }, CLOSE_DELAY);
  };

  const cancelScheduledClose = () => {
    clearCloseTimeout();
  };

  const openPerson = (key, person, e) => {
    cancelScheduledClose();
    positionOverlayFromRect(e.currentTarget.getBoundingClientRect());
    setSelectedPerson(person);
    setOpenKey(key);
  };

  const closeAll = () => {
    clearCloseTimeout();
    if (!branchKey && !openKey) return;

    const lines = branchLineRefs.current.filter(Boolean);
    const labels = branchLabelRefs.current.filter(Boolean);

    if (lines.length || labels.length) {
      setClosingBranch(true);

      // Re-measure each line's real length so we can retract it back to
      // "fully offset" — i.e. run the entrance draw-in animation
      // backwards, instead of just fading/scaling the whole branch out
      // as one flat blob.
      const lengths = lines.map((line) => {
        try {
          return line.getTotalLength();
        } catch {
          return 0;
        }
      });

      const tl = gsap.timeline({
        onComplete: () => {
          setBranchKey(null);
          setOpenKey(null);
          setSelectedPerson(null);
          setClosingBranch(false);
        },
      });

      tl.to(labels, {
        opacity: 0,
        scale: 0.9,
        y: 4,
        duration: 0.2,
        stagger: -0.05,
        ease: "power2.in",
      }).to(
        lines,
        {
          strokeDashoffset: (i) => lengths[i],
          duration: 0.4,
          stagger: -0.1,
          ease: "power2.in",
        },
        "-=0.05"
      );
    } else {
      setBranchKey(null);
      setOpenKey(null);
      setSelectedPerson(null);
    }
  };

  const branchNodes =
    branchKey && centers && wrapperSize
      ? computeBranchNodes(branchKey, centers[branchKey], wrapperSize)
      : [];

  useLayoutEffect(() => {
    if (!branchKey || closingBranch) return;

    const lines = branchLineRefs.current.filter(Boolean);
    const labels = branchLabelRefs.current.filter(Boolean);
    if (!lines.length && !labels.length) return;

    const lengths = lines.map((line) => {
      try {
        return line.getTotalLength();
      } catch {
        return 0;
      }
    });

    gsap.set(lines, {
      strokeDasharray: (i) => lengths[i],
      strokeDashoffset: (i) => lengths[i],
    });
    gsap.set(labels, { opacity: 0, scale: 0.9, y: 4 });

    const tl = gsap.timeline();
    tl.to(lines, {
      strokeDashoffset: 0,
      duration: 0.55,
      stagger: 0.1,
      ease: "power2.out",
    }).to(
      labels,
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: "power2.out",
      },
      "-=0.2"
    );

    return () => tl.kill();
  }, [branchKey, branchNodes.length, closingBranch, wrapperSize, centers]);

  useEffect(() => {
    if (!openKey) return;
    const onResize = () => {
      const el = document.querySelector(`[data-branch-label="${openKey}-${selectedPerson}"]`);
      if (el) positionOverlayFromRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [openKey, selectedPerson]);

  useEffect(() => {
    return () => clearCloseTimeout();
  }, []);

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
    })

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (!centers) return;

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
        "-=0.15"
      )
      .set(validLines, { strokeDasharray: "0.02 0.015" })
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
      if (wrapperRef.current) {
        const r = wrapperRef.current.getBoundingClientRect();
        setWrapperSize({ width: r.width, height: r.height });
      }
    };

    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  // Coordinate-resolved pairs for the SVG graph. CONNECTION_PAIRS itself
  // never changes identity, so this only swaps between the same stable
  // reference and an empty array.
  const pairs = centers ? CONNECTION_PAIRS : [];

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

  // Lines dim to a faint state whenever ANY circle is hovered or
  // focused (branch open / card open) — they never fully disappear now,
  // just fade to "very light" so the graph stays visible in the
  // background instead of vanishing.
  const isAnyActive = Boolean(hoveredKey || focusKey);

  return (
    <div className={styles.container} ref={containerRef} id="legacy">
      <div className={styles.grid}></div>
      <div
        style={{ backgroundImage: `url(${bg3})` }}
        ref={textureRef}
        className={styles.texture}
      ></div>

      <div className={styles.header}>
        <div
          alt="Header"
          ref={headerRef}
          className={styles.headerImage}
        >LEGACY</div>
        <div
          alt="Header"
          ref={headerFillRef}
          className={styles.headerOuterImage}
        >LEGACY</div>
      </div>

      <div
        className={`${styles.focusBackdrop} ${
          focusKey ? styles.focusBackdropVisible : ""
        }`}
        onClick={closeAll}
      />

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
              // All lines fade uniformly on hover/focus now — no
              // exception for lines touching the hovered circle.
              const isFaded = isAnyActive;

              if (!from || !to) return null;

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
                      isFaded ? styles.dimmed : ""
                    }`}
                  />

                  <line
                    ref={(el) => (overlayLineRefs.current[i] = el)}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    pathLength="1"
                    className={`${styles.overlayLine} ${
                      isFaded ? styles.dimmed : ""
                    }`}
                  />
                </g>
              );
            })}
          </g>
        </svg>
        {branchKey && branchNodes.length > 0 && (
          <svg
            className={styles.branchSvg}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1500,
              overflow: "visible",
            }}
          >
            <defs>
              <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4facfe" />
                <stop offset="100%" stopColor="#00c6ff" />
              </linearGradient>
            </defs>
            {branchNodes.map((node, i) => {
              const origin = centers[branchKey];
              if (!origin) return null;
              const d = `M ${origin.x} ${origin.y} L ${node.bendX} ${node.bendY} L ${node.x} ${node.y}`;
              return (
                <path
                  key={node.person}
                  ref={(el) => (branchLineRefs.current[i] = el)}
                  d={d}
                  className={styles.branchLine}
                />
              );
            })}
          </svg>
        )}

        {branchKey &&
          branchNodes.map((node, i) => (
            <button
              key={node.person}
              data-branch-label={`${branchKey}-${node.person}`}
              ref={(el) => (branchLabelRefs.current[i] = el)}
              className={styles.branchLabel}
              style={{
                left: node.x,
                top: node.y,
                zIndex: 1501,
              }}
              onMouseEnter={cancelScheduledClose}
              onMouseLeave={scheduleCloseBranch}
              onClick={(e) => {
                e.stopPropagation();
                openPerson(branchKey, node.person, e);
              }}
            >
              <span className={styles.branchName}>{node.person}</span>
            </button>
          ))}

        {circleList.map(({ key, ref, className, img }) => {
          const isDimmedCircle =
            (hoveredKey && hoveredKey !== key) ||
            (focusKey && focusKey !== key);
          const isFocused = focusKey === key;
          return (
            <div
              key={key}
              ref={(el) => {
                ref.current = el;
                circleDomRefs.current[key] = el;
              }}
              className={`${className} ${styles.circleBase} ${
                isDimmedCircle ? styles.circleDimmed : ""
              } ${isFocused ? styles.circleFocused : ""}`}
              style={{ zIndex: isFocused ? 1502 : undefined }}
              onMouseEnter={() => {
                setHoveredKey(key);
                openBranch(key);
              }}
              onMouseLeave={() => {
                setHoveredKey(null);
                scheduleCloseBranch();
              }}
              onClick={() => handleCircleClick(key)}
            >
              <LegacyCircle img={img} />
            </div>
          );
        })}
      </div>

      {openKey && (
        <div className={styles.backdrop} onClick={closeAll}>
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
            <LegacyCard onClose={closeAll} person={selectedPerson} />
          </div>
        </div>
      )}

      <div ref={footerRef} className={styles.footer}>
        <div className={styles.footerContent} ref={footerConRef}>
          <h2>DEPARTMENT OF</h2>
          <h1 className={styles.vm}>VISUAL MEDIA</h1>
        </div>

      </div>
      <div ref={gradientRef} className={styles.gradient}></div>
    </div>
  );
};

export default Legacy;