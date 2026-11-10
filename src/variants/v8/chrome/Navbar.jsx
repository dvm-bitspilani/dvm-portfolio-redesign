// V8 navbar. Left: the lockup: a crisp static print of the mark (inline SVG, there from the
// first paint, never animated in) + the Stretch Pro wordmark. On home the live hologram flies
// into the print's slot and crossfades into it (home/Hero.jsx drives `--mark-static`). Right:
// one Menu button. Between them, on the home page only, the chapter line: the film counter for
// the lamp (the docked mark), "02 ── Selected work", with the line filling in teal as the
// reader moves through the chapter: the year-by-year rail's parent, so that rail reads as the
// same device zoomed in (research/v8-cohesion.md §3.6). It is a readout, not a control: hidden
// from assistive tech, no pointer events; the menu stays the navigation.
// The full-screen menu renders the same Lockup + MenuToggle at the same positions, so the bar
// reads as staying on top of the menu with the button turned into Close.
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { isModifiedClick } from "../lib/events";
import { P } from "../lib/paths";
import { LOGO_D, LOGO_VIEWBOX } from "./markData";
import { useChrome } from "./shell";
import s from "./chrome.module.css";

// the viewBox's vertical extent (for the fill gradient in user space)
const MARK_TOP = -227.2;
const MARK_BOTTOM = 99.58;

const isHomePath = (pathname) => pathname.replace(/\/$/, "") === P("/");

/** The static mark: gradient fill + a hairline edge, and a white copy the hover scan reveals. */
function StaticMark({ id }) {
  const fill = `v8-mark-fill-${id}`;
  return (
    <>
      <svg className={s.print} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet" focusable="false">
        <defs>
          <linearGradient id={fill} gradientUnits="userSpaceOnUse" x1="0" y1={MARK_TOP} x2="0" y2={MARK_BOTTOM}>
            <stop offset="0" stopColor="#8df0ff" />
            <stop offset="0.55" stopColor="#45e6ff" />
            <stop offset="1" stopColor="#2cb8d6" />
          </linearGradient>
        </defs>
        {LOGO_D.map((d) => (
          <path key={d.slice(0, 12)} d={d} fill={`url(#${fill})`} />
        ))}
        {LOGO_D.map((d) => (
          <path key={`e${d.slice(0, 12)}`} d={d} className={s.printEdge} />
        ))}
      </svg>
      <svg className={s.scan} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet" focusable="false">
        {LOGO_D.map((d) => (
          <path key={d.slice(0, 12)} d={d} />
        ))}
      </svg>
    </>
  );
}

/** DVM lockup. `slot` marks the dock the live mark lands in (only the page's own bar has it). */
export function Lockup({ slot = true, onNavigate }) {
  const { pathname } = useLocation();
  const onHome = isHomePath(pathname);
  const onClick = (e) => {
    if (isModifiedClick(e)) return;
    onNavigate?.();
    if (!onHome) return;
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };
  return (
    <Link to={P("/")} className={s.brand} onClick={onClick} aria-label={onHome ? "DVM, back to top" : "DVM home"}>
      <span className={s.slot} data-v8-mark-slot={slot ? "" : undefined} aria-hidden="true">
        {/* the bar's print yields to the live mark while the home hero owns it; the menu's stays */}
        <span className={`${s.printLayer} ${slot ? s.printBar : ""}`}>
          <StaticMark id={slot ? "bar" : "menu"} />
        </span>
      </span>
      <span className={s.wordmark}>DVM</span>
    </Link>
  );
}

/** Menu / Close: two lines that turn into an ×. */
export function MenuToggle({ open, onClick }) {
  return (
    <button
      type="button"
      className={`${s.menuBtn} ${open ? s.isOpen : ""}`}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <span className={s.menuLabel}>{open ? "Close" : "Menu"}</span>
      <span className={s.lines} aria-hidden="true" />
    </button>
  );
}

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * The home's chapters are the sections marked data-chapter, in page order. Each one's scroll box
 * is its ScrollTrigger pin-spacer when it was pinned with spacing (Five teams), else the section
 * itself, minus any negative bottom margin (Year by year's track runs under the archive's).
 * The current chapter is the one holding the viewport's centre; its progress is how far the
 * centre is through its box. One scroll listener and rAF; the text and --p are written here
 * (React renders nothing per frame).
 */
function ChapterLine() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = el.querySelector("[data-index]");
    const name = el.querySelector("[data-name]");
    const line = el.querySelector("[data-line]");
    const last = { i: -2, p: -1, on: null };
    let raf = 0;
    const update = () => {
      raf = 0;
      const H = window.innerHeight;
      const c = H / 2;
      const hero = document.getElementById("top");
      const on = window.scrollY > (hero ? hero.offsetHeight : H) * 0.4;
      if (on !== last.on) {
        last.on = on;
        el.toggleAttribute("data-on", on);
      }
      const chapters = document.querySelectorAll("main [data-chapter]");
      let i = 0;
      let p = 0;
      chapters.forEach((sec, k) => {
        const box = sec.parentElement?.classList.contains("pin-spacer") ? sec.parentElement : sec;
        const r = box.getBoundingClientRect();
        const h = Math.max(1, r.height + Math.min(0, parseFloat(getComputedStyle(sec).marginBottom) || 0));
        if (r.top <= c) {
          i = k;
          p = Math.min(1, Math.max(0, (c - r.top) / h));
        }
      });
      if (!chapters.length) return;
      if (i !== last.i) {
        last.i = i;
        idx.textContent = pad2(i + 1);
        name.textContent = chapters[i].getAttribute("data-chapter") || "";
      }
      if (Math.abs(p - last.p) > 0.002) {
        last.p = p;
        line.style.setProperty("--p", p.toFixed(3));
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // pins and late layout (the timeline's track) settle after mount
    const late = window.setTimeout(schedule, 600);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return (
    <div ref={ref} className={s.chapter} aria-hidden="true">
      <span className={s.chapterIndex} data-index="">
        01
      </span>
      <span className={s.chapterLine} data-line="" />
      <span className={s.chapterName} data-name="" />
    </div>
  );
}

export default function Navbar() {
  const { openMenu, menuOpen } = useChrome();
  const { pathname } = useLocation();
  return (
    <header className={s.nav}>
      <Lockup />
      {isHomePath(pathname) && <ChapterLine />}
      <MenuToggle open={menuOpen} onClick={(e) => openMenu(e.currentTarget)} />
    </header>
  );
}
