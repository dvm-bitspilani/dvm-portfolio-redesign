// One project card, three sizes: "build" (a site / app / portal, 16:10), "lead" (the odd build
// out in a year, frame and copy side by side) and "film" (16:9, a play glyph, smaller title; the
// detail page's "Also from" row uses it for every kind). Hover and keyboard focus look the same:
// the still develops to full colour, the corner ticks come in, one sweep of light, the arrow.
import { Link, useLocation } from "react-router-dom";
import Leader from "./Leader";
import ui from "../../ui.module.css";
import p from "../projects.module.css";

export default function Card({ e, variant = "build", team = null, eager = false, i = 0, from, metaKind = false }) {
  const location = useLocation();
  const film = variant === "film";
  const meta = metaKind ? e.kind : film ? e.season : `${e.season} · ${e.kind}`;
  return (
    <Link
      to={e.href}
      state={{ from: from ?? location.search }}
      className={`${ui.card} ${p.card} ${p[variant]}`}
      style={{ "--i": i }}
    >
      <span className={`${ui.frame} ${p.cardFrame} ${p.ticks} ${p.sweep}`}>
        {e.cover ? (
          <img src={e.cover} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
        ) : (
          <Leader title={e.title} />
        )}
        {e.isFilm && e.cover && <span className={ui.play} aria-hidden="true" />}
      </span>
      <span className={p.cardCopy}>
        <span className={`${ui.cardTitle} ${p.cardTitle}`}>
          {e.title}
          <span className={p.arrow} aria-hidden="true">
            →
          </span>
        </span>
        <span className={ui.cardMeta}>{meta}</span>
        {variant === "lead" && e.r.summary && <span className={`${ui.cardLine} ${p.leadLine}`}>{e.r.summary}</span>}
        {!film && (
          <span className={`${ui.cardMeta} ${p.cardTeams} ${team ? "" : p.cardTeamsIdle}`}>
            {e.teams.map((t, k) => (
              <span key={t.id}>
                {k > 0 && " · "}
                <span className={t.id === team ? p.teamOn : undefined}>{t.label}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
