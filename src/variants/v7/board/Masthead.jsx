// The strip above the board: brand, where you are on the board, and the keys.
import { Link } from "react-router-dom";
import { P } from "../lib/paths";
import { ROUTES } from "./routes";
import { projectBySlug } from "../lib/data";
import s from "./v7.module.css";

const LOGO_VIEWBOX = "-470.31 -227.2 250.53 326.78";
const LOGO_D = [
  "M-470.31-189.24V-37.4l106.28,75.91l99.96-75.91v-151.83l-95.53,72.75l-55.04-37.33l-0.63,36.06l55.04,35.43l69.59-51.25v77.19l-72.75,56.3l-70.86-49.97l-1.26-120.84L-470.31-189.24z",
  "M-467.26-11.82l100.58,70.55l114.59-86.03v-177l32.31-22.9v212.9L-370.95,99.58l-99.36-72.4V-11.2L-467.26-11.82z",
];

export default function Masthead({ view }) {
  const home = view.key === "home";
  const project = view.sub ? projectBySlug.get(view.sub) : null;
  return (
    <header className={s.mast} style={{ viewTransitionName: "v7-head" }}>
      <Link to={P("/")} className={s.brand} aria-label="DVM, back to the board">
        <svg className={s.brandMark} viewBox={LOGO_VIEWBOX} aria-hidden="true">
          {LOGO_D.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <span className={s.wordmark}>DVM</span>
      </Link>
      <nav className={s.crumbs} aria-label="Location">
        <Link to={P("/")} className={s.crumb} aria-current={home ? "page" : undefined}>
          Board
        </Link>
        {!home && (
          <>
            <span className={s.sep} aria-hidden="true">/</span>
            <Link to={P(`/${view.key}`)} className={s.crumb} aria-current={view.sub ? undefined : "page"}>
              {ROUTES[view.key].title}
            </Link>
          </>
        )}
        {project && (
          <>
            <span className={s.sep} aria-hidden="true">/</span>
            <span className={s.crumb} aria-current="page">
              {project.title}
            </span>
          </>
        )}
      </nav>
      <p className={s.keys} aria-hidden="true">
        <span>
          <kbd className={s.kbd}>←</kbd>
          <kbd className={s.kbd}>→</kbd>
          <kbd className={s.kbd}>↑</kbd>
          <kbd className={s.kbd}>↓</kbd> move
        </span>
        <span>
          <kbd className={s.kbd}>↵</kbd> open
        </span>
        {!home && (
          <span>
            <kbd className={s.kbd}>Esc</kbd> {view.sub ? "back" : "board"}
          </span>
        )}
      </p>
    </header>
  );
}
