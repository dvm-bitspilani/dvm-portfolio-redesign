import { useRef, useState, useEffect, useLayoutEffect } from "react";
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

// EDIT THESE with the real names for each company/branch.
// Add/remove as many names as you want per company — branches and
// connecting lines are generated dynamically from this list's length.
const COMPANY_PEOPLE = {
  google: ["Person One", "Person Two", "Person Three" , "Person Four"],
  microsoft: ["Person One", "Person Two", "Person Three"],
  meta: ["Person One", "Person Two", "Person Three"],
  imc: ["Person One", "Person Two", "Person Three"],
  img1: ["Person One", "Person Two", "Person Three"],
  img2: ["Person One", "Person Two", "Person Three"],
  img3: ["Person One", "Person Two", "Person Three"],
};

// Static — defined once, outside the component, so its reference never
// changes across renders. This matters: effects that key off "which pairs
// exist" must NOT depend on a value that's recreated on every hover/click
// re-render, or they'll re-fire constantly and cause flicker.
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

// Computes where each person's branch should end.
// - Direction is purely horizontal-based: circles on the right half of the
//   screen branch OUT to the left, circles on the left branch out to the
//   right — so branches always grow into open space.
// - Each branch is an ELBOW connector (angled segment, then a flat run),
//   not a smooth curve: it fans out vertically from the circle, then
//   straightens out horizontally to reach its label. A branch level with
//   the circle (t === 0) is just a straight horizontal line, matching the
//   reference sketch.
// - Vertical fan spacing auto-shrinks if there isn't enough room, so
//   branches never overlap even with many names.
// - Fully dynamic: works for ANY number of names in COMPANY_PEOPLE[key].
const computeBranchNodes = (key, center, wrapperSize) => {
  if (!center || !wrapperSize) return [];
  const people = COMPANY_PEOPLE[key] || [];
  const n = people.length;
  if (!n) return [];

  const margin = 28;
  const isRightHalf = center.x > wrapperSize.width / 2;
  const dirSign = isRightHalf ? -1 : 1; // -1 = branch goes left, 1 = branch goes right

  // Vertical spacing between adjacent branch endpoints. Shrinks
  // automatically if the ideal spacing would run past the wrapper edges.
  // Bumped up from 46 -> 64 so labels don't crowd together once there
  // are more than 3 names.
  const availableVertical = Math.max(0, wrapperSize.height - margin * 2);
  let vSpread = 64;
  let totalSpread = (n - 1) * vSpread;
  if (totalSpread > availableVertical) {
    vSpread = n > 1 ? availableVertical / (n - 1) : 0;
    totalSpread = availableVertical;
  }

  // Horizontal distance the branch travels away from the circle.
  const maxHorizontal = isRightHalf
    ? center.x - margin
    : wrapperSize.width - margin - center.x;
  const desiredHorizontal = Math.min(200, Math.max(100, wrapperSize.width * 0.13));
  const horizontal = Math.max(70, Math.min(desiredHorizontal, maxHorizontal));

  // Where along the horizontal run the elbow bend sits (0 = at the
  // circle, 1 = at the label). A smaller fraction gives a longer flat
  // run, closer to the reference sketch.
  const bendFraction = 0.4;

  // Minimum vertical offset every branch must have, even the middle one.
  // Without this, a branch whose fan position lands exactly at t === 0
  // ends up perfectly level with the circle's own row — origin, bend,
  // and end all collinear — which visually gets swallowed by the circle
  // and reads as a missing line. This guarantees every branch always
  // has a real, visible bend.
  const minOffset = 18;

  return people.map((person, i) => {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5 .. 0.5, fan position

    let rawOffset = t * totalSpread;
    if (Math.abs(rawOffset) < minOffset) {
      // Push it off-axis by at least minOffset, keeping a stable
      // direction (alternate above/below) instead of collapsing to 0.
      rawOffset = i % 2 === 0 ? minOffset : -minOffset;
    }

    let endY = center.y + rawOffset;
    endY = Math.min(Math.max(endY, margin), wrapperSize.height - margin);

    let endX = center.x + dirSign * horizontal;
    endX = Math.min(Math.max(endX, margin), wrapperSize.width - margin);

    // The bend point shares the branch's final height (endY) but sits
    // partway along the horizontal distance — this is what creates the
    // angled-then-flat "elbow" look instead of a smooth curve.
    let bendX = center.x + dirSign * horizontal * bendFraction;
    bendX = Math.min(Math.max(bendX, margin), wrapperSize.width - margin);
    const bendY = endY;

    return { person, x: endX, y: endY, bendX, bendY };
  });
};

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

  // Refs to the connecting-graph lines (base + gradient overlay pair)
  const lineRefs = useRef([]);
  const overlayLineRefs = useRef([]);

  // key -> DOM node, used only to measure position for the overlay
  const circleDomRefs = useRef({});

  // DOM nodes for the currently-open branch (lines + labels), used for
  // the entrance/exit animation. Reset every time branchKey changes so
  // stale refs from a previous (possibly differently-sized) name list
  // never leak in.
  const branchLineRefs = useRef([]);
  const branchLabelRefs = useRef([]);

  const [centers, setCenters] = useState(null);
  const [wrapperSize, setWrapperSize] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);

  // Which company's branches are currently fanned out (first click)
  const [branchKey, setBranchKey] = useState(null);
  // True while the close animation is playing, so we can keep branch
  // nodes mounted just long enough to fade/collapse smoothly.
  const [closingBranch, setClosingBranch] = useState(false);

  // Which card is open, and where/how big the shared overlay should be
  const [openKey, setOpenKey] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [overlayPos, setOverlayPos] = useState({
    left: 0,
    top: 0,
    anchor: "left",
    width: 0,
  });

  const focusKey = branchKey || openKey;

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

  // Positions + sizes the shared card overlay based on a viewport rect
  // (the clicked name label's bounding box), fixed-width so every card
  // is identical, and flipped to the opposite side if it'd run offscreen.
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

  // First click on a circle: fan its branches out. Second click on the
  // same circle (or on the dark overlay) collapses them again.
  const toggleKey = (key) => {
    if (branchKey === key) {
      closeAll();
      return;
    }
    // Clear stale refs BEFORE switching branchKey, so a company with a
    // different number of names never reuses leftover ref slots.
    branchLineRefs.current = [];
    branchLabelRefs.current = [];
    setOpenKey(null);
    setSelectedPerson(null);
    setBranchKey(key);
  };

  // Click on a branch's name label: open the card, anchored to that label.
  const openPerson = (key, person, e) => {
    positionOverlayFromRect(e.currentTarget.getBoundingClientRect());
    setSelectedPerson(person);
    setOpenKey(key);
  };

  const closeAll = () => {
    if (!branchKey && !openKey) return;

    const targets = [...branchLineRefs.current, ...branchLabelRefs.current].filter(Boolean);
    if (targets.length) {
      setClosingBranch(true);
      gsap.to(targets, {
        opacity: 0,
        scale: 0.9,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setBranchKey(null);
          setOpenKey(null);
          setSelectedPerson(null);
          setClosingBranch(false);
        },
      });
    } else {
      setBranchKey(null);
      setOpenKey(null);
      setSelectedPerson(null);
    }
  };

  // Branch endpoints for the currently open company (recomputed whenever
  // circle positions or viewport size change). Dynamic length — driven
  // entirely by COMPANY_PEOPLE[branchKey].length.
  const branchNodes =
    branchKey && centers && wrapperSize
      ? computeBranchNodes(branchKey, centers[branchKey], wrapperSize)
      : [];

  // Grow the branch lines out of the circle, like branches extending from
  // a trunk: each path's REAL length is measured with getTotalLength()
  // (robust for any curve shape — straight, gentle, or sharp — unlike the
  // pathLength="1" attribute trick, which can fail to render certain
  // curves in some browsers). Runs in useLayoutEffect so the dash setup
  // is committed before the browser paints — no flash of a fully-drawn
  // line before it animates in.
  //
  // All lines now animate out SIMULTANEOUSLY (stagger removed) and the
  // whole entrance is faster than before.
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

    // Instantly set every line to "zero length visible" (fully offset)
    // before anything paints.
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

  // Reposition the open card if the window resizes.
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
  // reference and an empty array — it does NOT create a fresh array on
  // every hover/click re-render.
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

  // Hides ALL connecting graph lines the INSTANT a circle is focused
  // (branch fanned out or card open) — no fade, no waiting on the branch
  // entrance animation, it just disappears immediately on click. Uses
  // useLayoutEffect + gsap.set so it's committed before paint, in the
  // same frame the click triggers focusKey. Reopening (focusKey -> null)
  // still fades back in smoothly for a softer close.
  useLayoutEffect(() => {
    const lines = lineRefs.current.filter(Boolean);
    if (!lines.length) return;

    if (focusKey) {
      gsap.set(lines, { opacity: 0 });
    } else {
      gsap.to(lines, {
        opacity: 1,
        duration: 0.4,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }, [focusKey]);

  return (
    <div className={styles.container} ref={containerRef} id="legacy">
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

      {/* Dims everything behind the active circle. Sits BELOW circleWrapper
          in z-index, so the focused circle + branches stay bright on top
          of it without needing any portal/fixed-coordinate math. */}
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

              // Hover highlight is ONLY active when nothing is focused
              // (i.e. no branch/card is open) — clicking never triggers
              // the gradient overlay line, only hover does.
              const isHighlighted =
                !focusKey &&
                hoveredKey &&
                (hoveredKey === fromKey || hoveredKey === toKey);
              const isHoverDimmed =
                !focusKey && hoveredKey && !isHighlighted;

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
                      isHoverDimmed ? styles.dimmed : ""
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
                      isHighlighted ? styles.active : ""
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

        {/* Name labels at each branch tip — one per person, dynamic count */}
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
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              onClick={() => toggleKey(key)}
            >
              <LegacyCircle img={img} />
            </div>
          );
        })}
      </div>

      {/* Card overlay — opens once a branch name is clicked */}
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