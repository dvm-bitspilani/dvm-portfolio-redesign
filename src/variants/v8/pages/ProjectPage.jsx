// /projects/:name — one project as a dossier (research/v8-projects-page.md §6): the crumb bar
// (back to the filter you came from, n / N, previous / next), the head (a build: kicker, title, the
// fact ledger and the way out beside its gate; a film: the player in the gate, then title and
// ledger), the project's own description with the fest beside it, the screens, the teams that
// built it, the rest of that season, and the neighbours. Each section only when its data exists.
// ← / → walk the catalogue.
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../chrome/Navbar";
import { catalog, catalogById, festOf, hostOf, neighbours, rosterCount, verticalOf, TEAMS } from "../lib/catalog";
import { P } from "../lib/paths";
import { useReveal } from "../lib/reveal";
import Card from "./projects/Card";
import { FilmGate } from "./projects/Gate";
import Leader from "./projects/Leader";
import Screens from "./projects/Screens";
import ui from "../ui.module.css";
import p from "./projects.module.css";

const pad2 = (n) => String(n).padStart(2, "0");

/** Over 520 characters: two paragraphs, split at the sentence end nearest the middle. */
function paragraphs(text) {
  if (text.length <= 520) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (const m of text.matchAll(/\. (?=[A-Z])/g)) {
    const at = m.index + 1;
    if (best < 0 || Math.abs(at - mid) < Math.abs(best - mid)) best = at;
  }
  return best < 0 ? [text] : [text.slice(0, best).trim(), text.slice(best).trim()];
}

function Ledger({ e, film }) {
  const r = e.r;
  const teams = TEAMS.filter((t) => r.verticals.includes(t.id));
  const rows = [
    ["Fest", r.fest],
    ["Released", r.date ?? r.year],
    ["Type", e.kind],
    ["Theme", r.theme && `“${r.theme}”`],
  ].filter(([, v]) => v);
  return (
    <>
      <dl className={p.ledger} data-reveal>
        {rows.map(([k, v]) => (
          <div key={k} className={p.ledgerRow}>
            <dt className={ui.meta}>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {teams.length > 0 && (
          <div className={p.ledgerRow}>
            <dt className={ui.meta}>Teams</dt>
            <dd>
              {teams.map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ", "}
                  <Link to={`${P("/team")}?v=${t.id}`} className={p.ledgerLink}>
                    {t.label}
                  </Link>
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      {e.out && (
        <p className={`${p.cta} ${film ? p.ctaFilm : ""}`} data-reveal>
          <a className={`${ui.btn} ${ui.btnPrimary}`} href={e.out.url} target="_blank" rel="noreferrer noopener">
            {e.out.label} ↗
          </a>
        </p>
      )}
    </>
  );
}

function Kicker({ e }) {
  return (
    <>
      <p className={`${ui.meta} ${p.kicker}`} data-reveal>
        {e.season} · {e.kind}
      </p>
      {/* (no reveal on the h1: the shell hands it the focus after navigating, and a hidden
          element cannot take it) */}
      <h1 className={p.title}>
        {e.title}
      </h1>
      {e.r.subtitle && (
        <p className={`${ui.lede} ${p.subtitle}`} data-reveal>
          {e.r.subtitle}
        </p>
      )}
    </>
  );
}

function NotFound() {
  return (
    <>
      <Navbar />
      <main className={ui.page}>
        <header className={ui.pageHead} data-light="80% 22% 36vw">
          <div>
            <h1 className={ui.h1}>We couldn't find that project.</h1>
            <p className={p.backRow}>
              <Link to={P("/projects")} className={ui.link}>
                All projects →
              </Link>
            </p>
          </div>
        </header>
      </main>
    </>
  );
}

export default function ProjectPage() {
  const { name } = useParams();
  const e = catalogById.get(name) ?? null;
  if (!e) return <NotFound />;
  return <Dossier key={e.id} e={e} />;
}

function Dossier({ e }) {
  const r = e.r;
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from ?? "";
  const back = P("/projects") + from;
  const { prev, next } = neighbours(e);
  const headRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });

  // ← / → walk the catalogue (not inside a control, a tab row, an open dialog, or with a modifier)
  useEffect(() => {
    const on = (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.defaultPrevented) return;
      if (document.querySelector("dialog[open]") || document.querySelector("[data-v8-root] [inert]")) return;
      const t = ev.target;
      if (t instanceof Element && t.closest('input, textarea, select, button, iframe, [contenteditable], [role="tablist"]')) return;
      const to = ev.key === "ArrowLeft" ? prev : next;
      navigate(to.href, { state: { from } });
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [prev, next, from, navigate]);

  const fest = r.fest !== "Campus" ? festOf(r) : null;
  const season = catalog.filter((x) => x !== e && x.r.fest === r.fest && x.r.year === r.year && r.year).slice(0, 6);

  return (
    <>
      <Navbar />
      <main className={ui.page}>
        <article className={`${p.dossier} ${e.isFilm ? p.isFilm : ""}`} data-light="72% 36% 36vw">
          <nav className={`${ui.wrap} ${p.crumb}`} aria-label="Projects">
            <Link to={back} className={ui.link}>
              ← Projects
            </Link>
            <div className={p.crumbNav}>
              <span className={ui.meta}>
                {pad2(e.i + 1)} / {pad2(catalog.length)}
              </span>
              <Link to={prev.href} state={{ from }} className={p.step} aria-label={`Previous project: ${prev.title}`}>
                ←
              </Link>
              <Link to={next.href} state={{ from }} className={p.step} aria-label={`Next project: ${next.title}`}>
                →
              </Link>
            </div>
          </nav>

          {e.isFilm ? (
            <div ref={headRef} className={`${ui.wrap} ${p.filmHead}`}>
              <FilmGate key={e.id} e={e} />
              <div className={p.filmRow}>
                <div className={p.filmTitle}>
                  <Kicker e={e} />
                </div>
                <div className={p.filmFacts}>
                  <Ledger e={e} film />
                </div>
              </div>
            </div>
          ) : (
            <div ref={headRef} className={`${ui.wrap} ${p.buildHead}`}>
              <div className={p.buildCopy}>
                <Kicker e={e} />
                <Ledger e={e} />
              </div>
              <div className={`${ui.frame} ${p.detailGate} ${p.ticks} ${p.ticksOn}`} data-reveal>
                {e.cover ? (
                  <img src={e.cover} alt={e.title} loading="eager" fetchPriority="high" />
                ) : (
                  <Leader title={e.title} />
                )}
              </div>
            </div>
          )}

          {r.description && !e.isFilm && (
            <section className={p.sec} aria-labelledby="v8-p-about">
              <div className={`${ui.wrap} ${p.about}`}>
                <div className={p.aboutCopy}>
                  <h2 id="v8-p-about" className={`${ui.meta} ${p.secLabel}`}>
                    The project
                  </h2>
                  <div className={`${ui.prose} ${p.prose}`}>
                    {paragraphs(r.description).map((t) => (
                      <p key={t.slice(0, 24)}>{t}</p>
                    ))}
                  </div>
                </div>
                {fest && (
                  <aside className={`${ui.panel} ${p.fest}`}>
                    <h3 className={p.festName}>{fest.name}</h3>
                    <p className={`${ui.small} ${p.festBlurb}`}>{fest.blurb}</p>
                    {fest.website && (
                      <a className={ui.link} href={fest.website} target="_blank" rel="noreferrer noopener">
                        {hostOf(fest.website)} ↗
                      </a>
                    )}
                  </aside>
                )}
              </div>
            </section>
          )}

          {!e.isFilm && <Screens key={e.id} e={e} />}

          {r.verticals.length > 0 && (
            <section className={p.sec} aria-labelledby="v8-p-teams">
              <div className={ui.wrap}>
                <h2 id="v8-p-teams" className={`${ui.meta} ${p.secLabel}`}>
                  Built by
                </h2>
                <ul className={p.teamRows}>
                  {TEAMS.filter((t) => r.verticals.includes(t.id)).map((t) => {
                    const v = verticalOf(t.id);
                    return (
                      <li key={t.id}>
                        <Link to={`${P("/team")}?v=${t.id}`} className={p.teamRow}>
                          <span className={p.teamName}>{v?.name ?? t.label}</span>
                          <span className={`${ui.small} ${p.teamDesc}`}>{v?.description}</span>
                          <span className={`${ui.meta} ${p.teamN}`}>
                            {rosterCount(t.id)} on the roster <span className={p.teamArrow}>→</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {season.length > 0 && (
            <section className={p.sec} aria-labelledby="v8-p-season">
              <div className={ui.wrap}>
                <h2 id="v8-p-season" className={`${ui.meta} ${p.secLabel}`}>
                  Also from {e.season}
                </h2>
                <div className={p.seasonGrid}>
                  {season.map((x, i) => (
                    <Card key={x.id} e={x} variant="film" metaKind i={i} from={from} />
                  ))}
                </div>
              </div>
            </section>
          )}

          <nav className={p.nextPrev} aria-label="More projects">
            {[
              ["Previous", prev],
              ["Next", next],
            ].map(([label, x]) => (
              <Link key={label} to={x.href} state={{ from }} className={`${p.np} ${label === "Next" ? p.npNext : ""}`}>
                {x.cover && <img src={x.cover} alt="" loading="lazy" decoding="async" className={p.npStill} />}
                <span className={p.npIn}>
                  <span className={ui.meta}>{label}</span>
                  <span className={p.npTitle}>{x.title}</span>
                  <span className={ui.cardMeta}>
                    {x.season} · {x.kind}
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        </article>
      </main>
    </>
  );
}
