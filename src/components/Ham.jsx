import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Ham.module.css";
import d from "../assests/ham/D.svg";
import m from "../assests/ham/M.svg";
import arrow from "../assests/Legacy/arrow.png";
import { Link } from "react-router-dom";

// Fixed "poster" canvas. Everything below is positioned as a % of THIS
// box, never of the viewport — the whole box is then scaled as one
// rigid unit to fit whatever screen it's on (see useEffect below).
const BASE_W = 1200;
const BASE_H = 800;

const SEGMENTS = [
  {
    key: "blog",
    to: "/blog",
    viewBox: "0 0 43 205",
    path: "M41.8755 30.9828L0.5 0.980469V204.011L41.8755 185.519V30.9828Z",
    box: { top: 24, left: 21, width: 9, height: 40 },
    delay: 0.15,
    label: "BLOGS",
    side: "left",
    labelOffset: { x: 25, y: -20 },
  },
  {
    key: "about",
    to: "/#about",
    viewBox: "0 0 166 142",
    path: "M0.5 99.7651V140.873L164.4 13.2025L129.451 0.5625L0.5 99.7651Z",
    box: { top: 65, left: 30, width: 41, height: 31 },
    delay: 0.25,
    label: "ABOUT US",
    side: "right",
    labelOffset: { x: -150, y: 0 },
  },
  {
    key: "projects",
    to: "/projects",
    viewBox: "0 0 45 286",
    path: "M43.5591 0.982422L0.5 32.3572L0.501079 268.587L43.5591 284.348V0.982422Z",
    box: { top: 17, left: 55, width: 9, height: 51 },
    delay: 0.35,
    label: "PROJECTS",
    side: "right",
    labelOffset: { x: -15, y: -40 },
  },
  {
    key: "legacy",
    to: "/#legacy",
    viewBox: "0 0 222 98",
    path: "M34.5195 0.604782L0.996094 15.8899L115.481 97.077L220.844 15.8867L192.547 0.59375L115.481 59.1442L34.5195 0.604782Z",
    box: { top: 61, left: 9, width: 60, height: 22.5 },
    delay: 0.05,
    label: "OUR LEGACY",
    side: "left",
    labelOffset: { x: 180, y: 0 },
  },
  {
    key: "contact",
    to: "/contactus",
    viewBox: "0 0 143 154",
    path: "M0.5 51.1657V0.972656L141.862 102.288L141.286 152.689L0.5 51.1657Z",
    box: { top: 68, left: 16, width: 30, height: 28 },
    delay: 0.45,
    label: "CONTACT US",
    side: "left",
    labelOffset: { x: 150, y: 40 },
  },
  {
    key: "team",
    to: "/team",
    viewBox: "0 0 164 121",
    path: "M0.5 77.2672V42.7672L57.5312 82.9551L162.881 0.392578L134.565 59.8255L57.5273 120.103L0.5 77.2672Z",
    box: { top: 23, left: 24, width: 41, height: 25 },
    delay: 0.2,
    label: "TEAM",
    side: "left",
    labelOffset: { x: 120, y: 50 },
  },
  {
    key: "artwork",
    to: "/artwork",
    viewBox: "0 0 30 166",
    path: "M0.5 149.636L28.8066 164.933L28.7969 0.214844L0.5 59.7148V149.636Z",
    box: { top: 23, left: 49, width: 8, height: 42 },
    delay: 0.3,
    label: "ARTWORK",
    side: "right",
    labelOffset: { x: -20, y: 0 },
  },
];

const Ham = ({ onClose }) => {
  const [scale, setScale] = useState(1);
  const [hoveredKey, setHoveredKey] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const computeScale = () => {
      // Extra margin (0.88 / 0.88 instead of 0.94 / 0.92) leaves room
      // for label line/dot/text that overhangs the base 1200x800 canvas,
      // so labels never get clipped by the viewport edge.
      const availW = window.innerWidth * 0.88;
      const availH = window.innerHeight * 0.88;
      setScale(Math.min(availW / BASE_W, availH / BASE_H));
    };

    computeScale();
    window.addEventListener("resize", computeScale);
    window.addEventListener("orientationchange", computeScale);
    return () => {
      window.removeEventListener("resize", computeScale);
      window.removeEventListener("orientationchange", computeScale);
    };
  }, []);

  const handleEnter = (key) => setHoveredKey(key);
  const handleLeave = () => setHoveredKey(null);

  // Handles both real route navigation ("/projects") and same-page
  // anchor scrolling ("/#about", "/#legacy").
  const handleActivate = (to) => {
    if (to.startsWith("/#")) {
      const id = to.slice(2);

      if (window.location.pathname === "/") {
        // Already on the home page — just scroll to the section.
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      } else {
        // On another page — navigate home, then scroll once mounted.
        navigate("/", { state: { scrollTo: id } });
      }
    } else {
      navigate(to);
    }

    onClose();
  };

  return (
    <div className={styles.body}>
      <div
        className={styles.stage}
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <img
          src={d}
          className={styles.d}
          style={{ animationDelay: "0.1s" }}
          alt="D"
        />
        <img
          src={m}
          className={styles.m}
          style={{ animationDelay: "0.2s" }}
          alt="M"
        />

        <img
          src={arrow}
          className={styles.arrow}
          style={{ animationDelay: "0.6s" }}
          alt="Arrow"
          onClick={() => onClose()}
        />

        <div className={styles.logoWrapper}>
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <linearGradient id="hamHoverGradient" x1="45%" y1="0%" x2="55%" y2="100%">
                <stop offset="7.83%" stopColor="rgb(112,112,112)" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(67,67,67)" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="lineHoverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
          </svg>

          {/* ===== SEGMENTS LAYER — shapes only ===== */}
          {SEGMENTS.map((seg) => {
            const isHovered = hoveredKey === seg.key;
            return (
              <div
                key={seg.key}
                className={`${styles.segmentGroup} ${isHovered ? styles.isHovered : ""}`}
                style={{
                  top: `${seg.box.top}%`,
                  left: `${seg.box.left}%`,
                  width: `${seg.box.width}%`,
                  height: `${seg.box.height}%`,
                }}
              >
                {/* kept for semantics / ctrl+click / right-click-open,
                    but pointer-events: none in CSS so it never steals
                    hit-testing from the path below */}
                <Link to={seg.to} tabIndex={-1} aria-hidden="true" />

                <svg
                  viewBox={seg.viewBox}
                  className={styles.segmentSvg}
                  style={{ animationDelay: `${seg.delay}s` }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    className={`${styles.segment} ${isHovered ? styles.isHovered : ""}`}
                    d={seg.path}
                    stroke="black"
                    onMouseEnter={() => handleEnter(seg.key)}
                    onMouseLeave={handleLeave}
                    onClick={() => handleActivate(seg.to)}
                    role="link"
                    tabIndex={0}
                  />
                  <path
                    className={`${styles.segmentFill} ${isHovered ? styles.isHovered : ""}`}
                    d={seg.path}
                  />
                </svg>
              </div>
            );
          })}

          {/* ===== LABELS LAYER — always painted last, sits above every segment.
              Lives inside the SAME logoWrapper as the segments (not a duplicate),
              so it shares identical positioning/scale math. ===== */}
          <div className={styles.labelLayer}>
            {SEGMENTS.map((seg) => {
              const isHovered = hoveredKey === seg.key;
              const leftPos =
                seg.side === "left"
                  ? `${seg.box.left}%`
                  : `${seg.box.left + seg.box.width}%`;
              const { x: offsetX = 0, y: offsetY = 0 } = seg.labelOffset || {};

              return (
                <div
                  key={`${seg.key}-label`}
                  className={`${styles.label} ${styles[seg.side]} ${isHovered ? styles.isHovered : ""}`}
                  style={{
                    top: `${seg.box.top + seg.box.height / 2}%`,
                    left: leftPos,
                    animationDelay: `${seg.delay + 0.35}s`,
                    "--tx": seg.side === "left" ? "-100%" : "0%",
                    "--ox": `${offsetX}px`,
                    "--oy": `${offsetY}px`,
                  }}
                  onMouseEnter={() => handleEnter(seg.key)}
                  onMouseLeave={handleLeave}
                  onClick={() => handleActivate(seg.to)}
                  role="link"
                  tabIndex={0}
                >
                  <span className={styles.text}>{seg.label}</span>
                  <span className={styles.dot} />
                  <span className={styles.line} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ham;