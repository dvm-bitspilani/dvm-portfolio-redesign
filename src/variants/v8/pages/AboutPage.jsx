// /about: the department's copy and its numbers beside a contact sheet of the latest batch (the
// people who are the department right now, one still each, linking into the roster), then the
// five teams on the film strip (home/Teams.jsx: pinned and travelling on wide screens, the beam
// over it), then the year-by-year paper strip, latest year first like the home page's.
import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FoldTimeline } from "../../../immersive/kit/timeline";
import { site, stats, team, verticals } from "../../../immersive/data";
import Navbar from "../chrome/Navbar";
import { P } from "../lib/paths";
import { useReveal } from "../lib/reveal";
import Teams from "../home/Teams";
import { YEARS_LATEST_FIRST, toFoldStops } from "../home/storyData";
import { TEAM_ORDER } from "../home/teamStills";
import ui from "../ui.module.css";
import s from "./pages.module.css";

const ABOUT_STATS = stats.filter((x) => ["users on our apps and websites", "fests: BOSM, Oasis & APOGEE", "teams"].includes(x.label));

const TEAM_LABEL = Object.fromEntries(verticals.map((v) => [v.id, v.label]));
const rank = (id) => {
  const i = TEAM_ORDER.indexOf(id);
  return i < 0 ? TEAM_ORDER.length : i;
};

/** The latest batch (the latest two if the latest is small), in team order, then by name. */
function buildSheet() {
  const batches = [...new Set(team.map((m) => m.batch).filter(Boolean))].sort((a, b) => b - a);
  const latest = batches[0];
  let people = team.filter((m) => m.batch === latest);
  if (people.length < 14 && batches[1]) people = team.filter((m) => m.batch === latest || m.batch === batches[1]);
  people = [...people].sort((a, b) => rank(a.vertical) - rank(b.vertical) || a.name.localeCompare(b.name));
  return { latest, people };
}
const SHEET = buildSheet();

function ContactSheet() {
  const { latest, people } = SHEET;
  const [lit, setLit] = useState(null);
  const off = useCallback(() => setLit(null), []);
  const rest = `Batch of ${latest} · ${people.length} of ${team.length} on record`;
  return (
    <nav className={s.sheet} aria-label={`Batch of ${latest}`} data-reveal>
      <ul className={s.sheetGrid} onMouseLeave={off}>
        {people.map((m, i) => {
          const label = `${m.name.trim()}, ${TEAM_LABEL[m.vertical] ?? m.vertical}`;
          return (
            <li key={m.slug}>
              <Link
                to={`${P("/team")}?q=${encodeURIComponent(m.name.trim())}`}
                className={`${ui.card} ${s.sheetCell}`}
                aria-label={label}
                onMouseEnter={() => setLit(m)}
                onFocus={() => setLit(m)}
                onBlur={off}
              >
                <span className={`${ui.frame} ${s.sheetFrame}`}>
                  {m.photo ? (
                    <img src={m.photo} alt="" loading={i < 7 ? "eager" : "lazy"} />
                  ) : (
                    <span className={`${ui.initial} ${s.sheetInitial}`} aria-hidden="true">
                      {m.name.trim()[0]}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={s.sheetCap}>
        <span className={`${ui.meta} ${s.sheetNow}`} aria-hidden="true">
          {lit ? `${lit.name.trim()} · ${TEAM_LABEL[lit.vertical] ?? lit.vertical}` : rest}
        </span>
        <Link to={`${P("/team")}?b=${latest}`} className={ui.link}>
          Meet the team →
        </Link>
      </div>
    </nav>
  );
}

export default function AboutPage() {
  const headRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  const stops = useMemo(() => toFoldStops(YEARS_LATEST_FIRST, P), []);

  return (
    <>
      <Navbar />
      <main className={ui.page}>
        <header ref={headRef} className={ui.pageHead} data-light="76% 34% 28vw">
          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <h1 className={ui.h1} data-reveal="head">
                About DVM
              </h1>
              <div className={`${ui.prose} ${s.headProse}`}>
                {site.about.map((p) => (
                  <p key={p.slice(0, 20)} data-reveal>
                    {p}
                  </p>
                ))}
              </div>
              <dl className={`${ui.stats} ${s.headStats}`} data-reveal>
                {ABOUT_STATS.map((x) => (
                  <div key={x.label}>
                    <dt>{x.label}</dt>
                    <dd>{x.display}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <ContactSheet />
          </div>
        </header>

        <Teams page />

        <section className={`${ui.sec} ${s.years}`} data-light="50% 45% 34vw" aria-labelledby="v8-about-years">
          <div className={`${ui.wrap} ${ui.secHead}`}>
            <h2 id="v8-about-years" className={ui.h2}>
              Year by year
            </h2>
            <p className={ui.lede}>Fest themes, what shipped and every year's intake.</p>
          </div>
          <FoldTimeline items={stops} tone="teal" layout="vertical" title="DVM, year by year" />
        </section>
      </main>
    </>
  );
}
