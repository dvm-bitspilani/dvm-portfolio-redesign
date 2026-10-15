// Top bar: brand (the mark's outline + wordmark → the whole constellation), the route
// links (each one is a camera focus on the same graph) and the search trigger.
import { Link, useLocation } from "react-router-dom";
import { P } from "../lib/paths";
import { useShell } from "../lib/hooks";
import s from "./chrome.module.css";

export const NAV = [
  { to: "/projects", label: "Projects" },
  { to: "/legacy", label: "Legacy" },
  { to: "/team", label: "Team" },
  { to: "/blog", label: "Blogs" },
  { to: "/artwork", label: "Artwork" },
  { to: "/archive", label: "Archive" },
  { to: "/about", label: "About" },
  { to: "/contactus", label: "Contact" },
];

export const LOGO_VIEWBOX = "-470.31 -227.2 250.53 326.78";
export const LOGO_D = [
  "M-470.31-189.24V-37.4l106.28,75.91l99.96-75.91v-151.83l-95.53,72.75l-55.04-37.33l-0.63,36.06l55.04,35.43l69.59-51.25v77.19l-72.75,56.3l-70.86-49.97l-1.26-120.84L-470.31-189.24z",
  "M-467.26-11.82l100.58,70.55l114.59-86.03v-177l32.31-22.9v212.9L-370.95,99.58l-99.36-72.4V-11.2L-467.26-11.82z",
];

export function MarkOutline({ className }) {
  return (
    <svg className={className} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {LOGO_D.map((d) => (
        <path key={d.slice(0, 12)} d={d} />
      ))}
    </svg>
  );
}

export default function Header({ onSearch }) {
  const { pathname } = useLocation();
  const { compact } = useShell();
  const here = (to) => pathname === P(to) || pathname.startsWith(P(to) + "/");
  return (
    <header className={s.header}>
      <Link to={P("/")} className={s.brand} aria-label="DVM, the whole constellation">
        <MarkOutline className={s.brandMark} />
        <span className={s.wordmark}>DVM</span>
      </Link>
      <nav className={s.nav} aria-label="Sections">
        <ul>
          {NAV.map((n) => (
            <li key={n.to}>
              <Link to={P(n.to)} className={s.navLink} aria-current={here(n.to) ? "page" : undefined}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <button type="button" className={s.searchBtn} onClick={onSearch} aria-label="Search every node" aria-keyshortcuts="Meta+K Control+K /">
        <svg viewBox="0 0 20 20" aria-hidden="true" className={s.searchIcon}>
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M13 13l4.5 4.5" />
        </svg>
        {!compact && <span className={s.searchText}>Find a node</span>}
        {!compact && <kbd className={s.kbd}>⌘K</kbd>}
      </button>
    </header>
  );
}
