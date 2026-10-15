// Home: the whole constellation, plus a short intro and a key that doubles as navigation.
import { Link } from "react-router-dom";
import { P } from "../lib/paths";
import { useShell } from "../lib/hooks";
import NodeDetail from "./NodeDetail";
import s from "./home.module.css";

const GLYPH = {
  fest: <circle cx="8" cy="8" r="5.2" fill="none" strokeWidth="1.6" />,
  vertical: <path d="M8 2.2L13.8 8 8 13.8 2.2 8z" />,
  project: <circle cx="8" cy="8" r="4.4" />,
  member: <circle cx="8" cy="8" r="2.6" />,
  blog: <rect x="4" y="4" width="8" height="8" />,
  year: <circle cx="8" cy="8" r="5.2" fill="none" strokeWidth="1.6" />,
};

export default function HomePanel() {
  const { state, graph, openSearch, compact } = useShell();
  if (state.selectedNode) return <NodeDetail node={state.selectedNode} />;
  const count = (k) => graph.nodes.filter((n) => n.kind === k).length;
  const key = [
    { k: "fest", n: count("fest"), label: "fests", to: "/projects" },
    { k: "vertical", n: count("vertical"), label: "teams", to: "/team" },
    { k: "project", n: count("project"), label: "projects", to: "/projects" },
    { k: "member", n: count("member"), label: "members", to: "/team" },
    { k: "blog", n: count("blog") + count("art"), label: "posts and artworks", to: "/blog" },
    { k: "year", n: count("year"), label: "years", to: "/legacy", warm: true },
  ];
  return (
    <section className={s.intro} aria-labelledby="v6-home-title">
      <p className={s.kicker}>Department of</p>
      <h1 id="v6-home-title" className={s.title}>
        Visual
        <br />
        Media
      </h1>
      <p className={s.lede}>
        Every website, app and film we have made for BITS Pilani’s fests, the people who made them, and what they wrote and drew along the way. One network, with the mark at its centre.
      </p>
      <ul className={s.key} aria-label="What is on the map">
        {key.map((x) => (
          <li key={x.label}>
            <Link to={P(x.to)} className={`${s.keyItem} ${x.warm ? s.warm : ""}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true" className={s.glyph}>{GLYPH[x.k]}</svg>
              <span className={s.keyNum}>{x.n}</span>
              <span className={s.keyLabel}>{x.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={s.hint}>
        {compact ? "Drag the map, pinch to zoom, tap a node to open it. " : "Drag to move, scroll to zoom, hover a node to see what it touches. "}
        <button type="button" className={s.searchLink} onClick={openSearch}>
          Find anything{compact ? "" : " with ⌘K"}
        </button>
      </p>
    </section>
  );
}
