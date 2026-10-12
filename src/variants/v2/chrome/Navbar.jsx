// V2 navbar: same wordmark + hamburger as the base, links scoped to /v/v2, plus an
// Archive door and an optional slot (the home page puts its ASCII switch there).
import { Link, useLocation } from "react-router-dom";
import ham from "../../../assests/hamBtn.png";
import { P } from "../lib/paths";
import s from "./chrome.module.css";

export default function Navbar({ onHamClick, children }) {
  const { pathname } = useLocation();
  const onHome = pathname.replace(/\/$/, "") === P("/");
  return (
    <header className={s.nav}>
      <Link
        to={P("/")}
        className={s.wordmark}
        onClick={() => onHome && window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="DVM home"
      >
        DVM
      </Link>
      <div className={s.navRight}>
        {children}
        <Link to={P("/archive")} className={s.navLink} aria-current={pathname.endsWith("/archive") ? "page" : undefined}>
          Archive
        </Link>
        <button type="button" className={s.ham} onClick={onHamClick} aria-label="Open menu">
          <img src={ham} alt="" className={s.hamIcon} />
        </button>
      </div>
    </header>
  );
}
