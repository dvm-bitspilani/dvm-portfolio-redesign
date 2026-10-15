// Focus history: the trail of graph focus states visited, newest last.
import { Link } from "react-router-dom";
import s from "./chrome.module.css";

export default function Crumbs({ trail }) {
  if (trail.length < 2) return null;
  return (
    <nav className={s.crumbs} aria-label="Focus history">
      <ol>
        {trail.map((c, k) => {
          const last = k === trail.length - 1;
          return (
            <li key={c.key}>
              {last ? (
                <span aria-current="location" className={s.crumbHere}>{c.label}</span>
              ) : (
                <Link to={c.to} className={s.crumb}>{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
