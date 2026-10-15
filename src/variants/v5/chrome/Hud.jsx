// The projection-booth HUD over every reel: the lamp's booth + reel name (top),
// the chapter / shot counter, the scrubber and the running timecode (bottom).
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ham from "../../../assests/hamBtn.png";
import { P, isHomePath } from "../lib/paths";
import { reelFor } from "../lib/reels";
import { projectBySlug, timecode } from "../lib/data";
import { useChrome } from "./shell";
import { LOGO_D, LOGO_VIEWBOX } from "../lib/logo";
import { useBus } from "../reel/context";
import s from "./hud.module.css";

export function Header() {
  const { pathname } = useLocation();
  const { openMenu, menuOpen, lamp } = useChrome();
  const bus = useBus();
  const reel = reelFor(pathname);
  const onHome = isHomePath(pathname);
  const scene = reel.scene ? projectBySlug.get(reel.scene) : null;
  return (
    <header className={s.head}>
      <Link
        to={P("/")}
        className={s.brand}
        onClick={(e) => {
          if (!onHome) return;
          e.preventDefault();
          bus.go(0);
        }}
        onPointerEnter={() => lamp.current?.ripple(0.014)}
        aria-label={onHome ? "DVM, rewind to the start" : "DVM home"}
      >
        <span className={s.slot} data-v5-lamp-slot="" aria-hidden="true">
          <svg className={s.ghost} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet">
            {LOGO_D.map((d) => (
              <path key={d.slice(0, 12)} d={d} />
            ))}
          </svg>
        </span>
        <span className={s.word}>DVM</span>
      </Link>
      <p className={s.reel} aria-live="polite">
        <span className={s.reelN}>Reel {reel.n}</span>
        <span className={s.reelName}>{scene ? scene.title : reel.name}</span>
      </p>
      <nav className={s.right} aria-label="Primary">
        <Link to={P("/archive")} className={s.link} aria-current={pathname.endsWith("/archive") ? "page" : undefined}>
          Archive
        </Link>
        <button type="button" className={s.ham} onClick={(e) => openMenu(e.currentTarget)} aria-label="Open the reel index" aria-haspopup="dialog" aria-expanded={menuOpen}>
          <img src={ham} alt="" className={s.hamIcon} />
        </button>
      </nav>
    </header>
  );
}

/** Bottom HUD: chapter + shot, scrubber, timecode. Updated straight from the bus ticker. */
export function Footer({ scene = false }) {
  const bus = useBus();
  const tcRef = useRef(null);
  const shotRef = useRef(null);
  const chapRef = useRef(null);
  const [frames, setFrames] = useState([]);
  useEffect(() => bus.onFrames((f) => setFrames(f.slice())), [bus]);

  const chapterOf = useMemo(() => {
    let cur = frames[0]?.chapter || "";
    return frames.map((f) => (cur = f.chapter || cur));
  }, [frames]);

  useEffect(() => {
    let lastTc = "";
    let lastShot = "";
    let lastChap = "";
    return bus.subscribe((b) => {
      const tc = timecode(b.attached ? (b.pos / Math.max(1, b.size)) * 4 : 0);
      if (tc !== lastTc && tcRef.current) tcRef.current.textContent = lastTc = tc;
      if (!b.attached || !b.frames.length) return;
      const i = b.currentIndex();
      const shot = `Shot ${String(i + 1).padStart(2, "0")} of ${String(b.frames.length).padStart(2, "0")}`;
      if (shot !== lastShot && shotRef.current) shotRef.current.textContent = lastShot = shot;
      const chap = chapterOf[i] || "";
      if (chap !== lastChap && chapRef.current) chapRef.current.textContent = lastChap = chap;
    });
  }, [bus, chapterOf]);

  return (
    <div className={s.foot} data-scene={scene ? "" : undefined}>
      <p className={s.now}>
        <span ref={chapRef} className={s.chap} />
        <span ref={shotRef} className={s.shot} />
      </p>
      <Scrubber frames={frames} scene={scene} />
      <p className={s.tc} aria-label="Timecode">
        <span className={s.lampDot} aria-hidden="true" />
        <span ref={tcRef}>00:00:00:00</span>
      </p>
    </div>
  );
}

function Scrubber({ frames, scene }) {
  const bus = useBus();
  const bar = useRef(null);
  const head = useRef(null);
  const total = frames.length ? Math.max(1, bus.max + bus.size) : 1;
  // chapter labels, skipping any that would collide with the previous one
  const chapters = [];
  frames.forEach((f) => {
    if (!f.chapter) return;
    const x = f.x / total;
    const prev = chapters[chapters.length - 1];
    if (prev && x - prev.x / total < Math.max(0.05, prev.chapter.length * 0.0135 + 0.012)) return;
    chapters.push(f);
  });

  useEffect(
    () =>
      bus.subscribe((b) => {
        const h = head.current;
        if (!h || !b.attached) return;
        const tot = Math.max(1, b.max + b.size);
        h.style.left = `${((b.pos / tot) * 100).toFixed(3)}%`;
        h.style.width = `${Math.max(1.5, (b.size / tot) * 100).toFixed(3)}%`;
        bar.current?.setAttribute("aria-valuenow", String(Math.round(b.max ? (b.pos / b.max) * 100 : 0)));
      }),
    [bus],
  );

  const seek = (clientX) => {
    const r = bar.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    bus.go(frac * (bus.max + bus.size) - bus.size / 2);
  };
  const onDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(e.clientX);
  };
  const onMove = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seek(e.clientX);
  };
  const onKey = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") bus.step(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") bus.step(-1);
    else if (e.key === "Home") bus.go(0);
    else if (e.key === "End") bus.go(bus.max);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={s.scrub}>
      <div className={s.chapters} aria-hidden="true">
        {chapters.map((f) => (
          <button
            key={f.id || f.i}
            type="button"
            tabIndex={-1}
            className={s.chapter}
            style={{ left: `${(f.x / total) * 100}%` }}
            onClick={() => bus.goToFrame(f.i)}
          >
            {f.chapter}
          </button>
        ))}
      </div>
      <div
        ref={bar}
        className={s.bar}
        role="slider"
        tabIndex={0}
        aria-label={scene ? "Scene scrubber" : "Reel position"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onKeyDown={onKey}
      >
        {frames.map((f) => (
          <span
            key={f.i}
            className={`${s.seg} ${f.chapter ? s.segChapter : ""}`}
            style={{ left: `${(f.x / total) * 100}%`, width: `${(f.w / total) * 100}%`, backgroundImage: f.thumb ? `url(${f.thumb})` : undefined }}
          />
        ))}
        <span ref={head} className={s.head2} />
      </div>
    </div>
  );
}
