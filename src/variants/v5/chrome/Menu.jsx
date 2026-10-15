// The reel index: every route as a numbered reel. Hover / focus previews the reel's
// logline; Esc or the close button rolls the index away and returns focus.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { REELS, reelFor, reelHref } from "../lib/reels";
import { socials } from "../lib/data";
import s from "./menu.module.css";

export default function Menu({ closing, onClose, onClosed, returnFocus }) {
  const { pathname } = useLocation();
  const current = reelFor(pathname);
  const [active, setActive] = useState(current.n);
  const root = useRef(null);
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const els = [...root.current.querySelectorAll("a, button")];
        const i = els.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          els[els.length - 1].focus();
        } else if (!e.shiftKey && i === els.length - 1) {
          e.preventDefault();
          els[0].focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      returnFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose, returnFocus]);

  const reel = REELS.find((r) => r.n === active) || REELS[0];
  return (
    <div
      ref={root}
      className={`${s.menu} ${closing ? s.closing : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Reel index"
      data-reel-native=""
      onAnimationEnd={(e) => e.target === e.currentTarget && closing && onClosed()}
    >
      <div className={s.top}>
        <p className={s.kicker}>Department of Visual Media, BITS Pilani</p>
        <button ref={first} type="button" className={s.close} onClick={onClose}>
          Close
          <span className={s.x} aria-hidden="true" />
        </button>
      </div>
      <nav className={s.list} aria-label="Reels">
        <ol>
          {REELS.map((r) => (
            <li key={r.n} style={{ "--i": r.n }}>
              <Link
                to={reelHref(r)}
                className={`${s.item} ${r.n === current.n ? s.current : ""}`}
                aria-current={r.n === current.n ? "page" : undefined}
                onPointerEnter={() => setActive(r.n)}
                onFocus={() => setActive(r.n)}
                onClick={() => r.n === current.n && onClose()}
              >
                <span className={s.n}>R{r.n}</span>
                <span className={s.name}>{r.menu}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <aside className={s.preview} aria-live="polite">
        <div className={s.can} aria-hidden="true">
          <span className={s.canN}>{reel.n}</span>
        </div>
        <p className={s.reelName}>
          Reel {reel.n}, {reel.name}
        </p>
        <p className={s.blurb}>{reel.blurb}</p>
      </aside>
      <ul className={s.socials}>
        {socials.map((so) => (
          <li key={so.id}>
            <a href={so.url} target="_blank" rel="noreferrer">
              {so.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
