// Our legacy, inside the expanded sparkline tile: projects per year (pick a year to list it),
// members per batch, and the roll of position holders.
import { useState } from "react";
import { Link } from "react-router-dom";
import Page from "./Page";
import { years, batches, team, KIND_LABEL, VERTICAL_LABEL } from "../lib/data";
import { P } from "../lib/paths";
import p from "./pages.module.css";

const maxCount = Math.max(...years.map((y) => y.count));
const maxBatch = Math.max(...batches.map((b) => b.count));
const latest = [...years].reverse().find((y) => y.count > 0);
const roll = team
  .filter((m) => m.designation)
  .sort((a, b) => a.batch - b.batch || a.name.localeCompare(b.name));

export default function LegacyPage() {
  const [sel, setSel] = useState(latest.year);
  const year = years.find((y) => y.year === sel);
  const total = years.reduce((a, y) => a + y.count, 0);
  return (
    <Page id="legacy" label="Projects per year" title="Our legacy" readout={`${years[0].year}–${years[years.length - 1].year}`}>
      <p className={p.lead}>
        {total} dated projects since {years[0].year}. Pick a year to see what shipped.
      </p>
      <div className={p.chart} style={{ "--cols": years.length }} role="group" aria-label="Projects per year">
        {years.map((y, k) => (
          <button
            key={y.year}
            type="button"
            className={p.yearBtn}
            aria-pressed={sel === y.year}
            aria-label={`${y.year}: ${y.count} projects (${y.builds} websites and apps, ${y.films} films)`}
            onClick={() => setSel(y.year)}
          >
            <span className={p.yearCount}>{y.count}</span>
            <span className={p.yearBar} style={{ "--h": `${(y.count / maxCount) * 82}%`, "--k": k }}>
              <i className={p.builds} style={{ "--f": y.builds }} />
              <i className={p.films} style={{ "--f": y.films }} />
            </span>
            <span className={p.yearNum}>{y.year}</span>
          </button>
        ))}
      </div>
      <p className={p.legend} aria-hidden="true">
        <span>
          <i style={{ background: "rgba(69,230,255,.75)" }} />
          Websites, apps, portals
        </span>
        <span>
          <i style={{ background: "rgba(207,232,255,.5)" }} />
          Films
        </span>
      </p>

      <h2 className={p.h2}>
        {year.year} <small>{year.count ? `${year.count} projects` : "nothing on record"}</small>
      </h2>
      {year.count ? (
        <ul className={p.ledger}>
          {year.list.map((x) => (
            <li key={x.slug}>
              <Link to={P(`/projects/${x.slug}`)}>{x.title}</Link>
              <span>
                {x.fest}, {KIND_LABEL[x.kind]}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={p.body}>No projects from {year.year} are in the archive yet.</p>
      )}

      <h2 className={p.h2}>
        Members by batch <small>{team.length} on record</small>
      </h2>
      <div className={p.batchRow} style={{ "--cols": batches.length }}>
        {batches.map((b) => (
          <div key={b.batch} className={p.batch} aria-label={`Batch of ${b.batch}: ${b.count} members`}>
            <span>{b.count}</span>
            <b style={{ "--h": `${(b.count / maxBatch) * 70}%` }} />
            <span>{b.batch}</span>
          </div>
        ))}
      </div>

      <h2 className={p.h2}>
        Position holders <small>{roll.length}</small>
      </h2>
      <ul className={p.roll}>
        {roll.map((m) => (
          <li key={m.slug}>
            <span className={p.mono}>{m.batch}</span>
            <span>
              <b>{m.name}</b>
              <small>
                {m.designation}, {VERTICAL_LABEL[m.vertical]}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </Page>
  );
}
