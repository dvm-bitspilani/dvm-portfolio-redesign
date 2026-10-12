// V2 navbar. Left: the brand lockup, whose slot is where the live mercury mark docks
// (a faint outline of the mark waits there while the mark is elsewhere, e.g. in the hero).
// Right: Archive door + the menu button (opens the shell's full-screen menu).
import { Link, useLocation } from "react-router-dom";
import ham from "../../../assests/hamBtn.png";
import { P } from "../lib/paths";
import { LOGO_D, LOGO_VIEWBOX, useMark } from "./mark";
import { useChrome } from "./shell";
import s from "./chrome.module.css";

export default function Navbar({ children }) {
  const { pathname } = useLocation();
  const { openMenu, menuOpen } = useChrome();
  const mark = useMark();
  const onHome = pathname.replace(/\/$/, "") === P("/");
  const onBrand = (e) => {
    if (!onHome) return;
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };
  return (
    <header className={s.nav}>
      <Link
        to={P("/")}
        className={s.brand}
        onClick={onBrand}
        onPointerEnter={() => mark?.ripple(0.014)}
        aria-label={onHome ? "DVM, back to top" : "DVM home"}
      >
        <span className={s.slot} data-v2-mark-slot aria-hidden="true">
          <svg className={s.ghost} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet">
            {LOGO_D.map((d) => (
              <path key={d.slice(0, 12)} d={d} />
            ))}
          </svg>
        </span>
        <span className={s.wordmark}>DVM</span>
      </Link>
      <div className={s.navRight}>
        {children}
        <Link to={P("/archive")} className={s.navLink} aria-current={pathname.endsWith("/archive") ? "page" : undefined}>
          Archive
        </Link>
        <button
          type="button"
          className={s.ham}
          onClick={(e) => openMenu(e.currentTarget)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          data-v2-ham
        >
          <img src={ham} alt="" className={s.hamIcon} />
        </button>
      </div>
    </header>
  );
}
