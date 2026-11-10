// The dossier for the year under the camera on the paper strip: year, a headline where one is
// recorded, the fest editions and their themes, a still when a project of that year has a
// cover, then what shipped and who joined. Every line is optional and only renders when the
// data has it.
import { Link } from "react-router-dom";
import { P } from "../lib/paths";
import { foldedNotes, shippedSummary } from "./storyData";
import ui from "../ui.module.css";
import s from "./story.module.css";

export default function YearPanel({ stop, className = "" }) {
  if (!stop) return null;
  const summary = shippedSummary(stop);
  const folded = foldedNotes(stop);
  return (
    <aside className={`${ui.panel} ${s.panel} ${stop.image ? s.panelWithStill : ""} ${className}`} aria-live="polite" aria-label={`Year ${stop.year}`}>
      <h3 className={ui.h3}>{stop.label ?? stop.year}</h3>
      {stop.headline && <p className={s.panelHeadline}>{stop.headline}</p>}
      {stop.editions.length > 0 && (
        <ul className={s.panelEditions}>
          {stop.editions.map((e) => (
            <li key={e.fest}>
              <span className={s.panelFest}>{e.fest}</span>
              {e.theme && <span className={s.panelTheme}> — “{e.theme}”</span>}
            </li>
          ))}
        </ul>
      )}
      {stop.image && (
        <figure className={s.panelStill}>
          <span className={`${ui.frame} ${s.panelFrame}`}>
            <img src={stop.image.src} alt="" loading="lazy" />
          </span>
          <figcaption className={s.panelCaption}>{stop.image.title}</figcaption>
        </figure>
      )}
      {(summary || stop.intake || stop.artworks || folded.length > 0) && (
        <dl className={s.panelFacts}>
          {summary && (
            <div>
              <dt>Shipped</dt>
              <dd>{summary}</dd>
            </div>
          )}
          {stop.intake ? (
            <div>
              <dt>Joined</dt>
              <dd>
                <Link to={P("/team")} className={s.panelLink}>
                  {stop.intake} {stop.intake === 1 ? "member" : "members"}
                </Link>
              </dd>
            </div>
          ) : null}
          {stop.artworks ? (
            <div>
              <dt>Artwork</dt>
              <dd>
                <Link to={P("/artwork")} className={s.panelLink}>
                  {stop.artworks} {stop.artworks === 1 ? "piece" : "pieces"}
                </Link>
              </dd>
            </div>
          ) : null}
          {/* years that are not stops of their own, folded into this dossier */}
          {folded.map((f) => (
            <div key={f.year}>
              <dt>{f.year}</dt>
              <dd>{[f.joined, f.art].filter(Boolean).join(" · ")}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
