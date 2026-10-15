// "Now shipping": every project on record running past like a wire feed. Expands into Projects
// (and Projects/:name, a different page inside the same tile).
import ProjectsPage from "../pages/ProjectsPage";
import ProjectDetail from "../pages/ProjectDetail";
import { projectsSorted, KIND_LABEL } from "../lib/data";
import t from "./tiles.module.css";

function Items({ hidden }) {
  return (
    <ul className={t.tickList} aria-hidden={hidden || undefined}>
      {projectsSorted.map((p) => (
        <li key={p.slug} className={t.tickItem}>
          <span className={t.tickFest} data-fest={p.fest}>
            {p.fest}
          </span>
          <span className={t.tickTitle}>{p.title}</span>
          <span className={t.tickMeta}>
            {KIND_LABEL[p.kind]}
            {p.year ? `, ${p.year}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TickerTile({ role, view, label }) {
  if (role === "primary") {
    return view.sub ? <ProjectDetail slug={view.sub} /> : <ProjectsPage />;
  }
  return (
    <div className={t.ticker} data-role={role}>
      <div className={t.tickHead}>
        <span className={t.led} data-led="live" aria-hidden="true" />
        <h2 id="v7-h-ticker" className={t.label}>
          {label}
        </h2>
      </div>
      <div className={t.tickWindow}>
        <div className={t.tickTrack} style={{ "--n": projectsSorted.length }}>
          <Items />
          <Items hidden />
        </div>
      </div>
    </div>
  );
}
