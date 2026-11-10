// /projects — "the print room" (research/v8-projects-page.md §5). The hero is a projection gate
// running the featured reel (the home strip's five) with its caption beside it; under it the
// console bar (team tabs + year jumps) sticks below the navbar; then the whole catalogue, year by
// year along a film rail: builds as large frames (the odd one out in a year as a wide lead), films
// three-up after them. The team filter lives in the URL (?team=), so Back from a project restores it.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../chrome/Navbar";
import { TEAMS, catalog, catalogSummary, catalogYears, inTeam, teamCount } from "../lib/catalog";
import { useMedia, useReducedMotion } from "../lib/hooks";
import { featuredReel } from "../lib/projects";
import { useReveal } from "../lib/reveal";
import Card from "./projects/Card";
import { ReelGate } from "./projects/Gate";
import { useReel } from "./projects/reel";
import ui from "../ui.module.css";
import p from "./projects.module.css";

const REEL = featuredReel();
const TABS = [{ id: null, label: "All" }, ...TEAMS].map((t) => ({ ...t, n: teamCount(t.id), tabId: `v8-ptab-${t.id ?? "all"}` }));
const YEAR_JUMPS = catalogYears.filter(Boolean);
const pad2 = (n) => String(n).padStart(2, "0");

/** The year groups under a filter (empty ones dropped). Themes belong to the year, not the filter. */
function groupsFor(team) {
  return catalogYears
    .map((year) => {
      const all = catalog.filter((e) => (e.r.year ?? null) === year);
      const items = all.filter((e) => inTeam(e, team));
      return {
        year,
        key: year ?? "undated",
        themes: [...new Set(all.map((e) => e.r.theme).filter(Boolean))],
        builds: items.filter((e) => !e.isFilm),
        films: items.filter((e) => e.isFilm),
        n: items.length,
      };
    })
    .filter((g) => g.n > 0);
}

function Caption({ e, i }) {
  return (
    <div className={p.caption} aria-live="off" data-reveal>
      <div key={e.id} className={p.capIn}>
        <p className={`${ui.meta} ${p.capCount}`}>
          <span className={p.capNum}>{pad2(i + 1)}</span> / {pad2(REEL.length)}
        </p>
        <p className={p.capTitle}>{e.title}</p>
        <p className={`${ui.cardMeta} ${p.capMeta}`}>
          {e.season} · {e.kind}
        </p>
        <p className={`${ui.cardLine} ${p.capLine}`}>{e.r.summary ?? ""}</p>
      </div>
    </div>
  );
}

function YearGroup({ g, team, first }) {
  const hid = `y-${g.key}`;
  const lead = g.builds.length % 2 === 1 ? g.builds[0] : null;
  const pairs = lead ? g.builds.slice(1) : g.builds;
  let i = 0;
  return (
    <section className={p.year} aria-labelledby={hid} data-year={g.key}>
      <div className={p.yearHead}>
        <h2 id={hid} tabIndex={-1} className={g.year ? p.yearNum : p.yearUndated}>
          {g.year ?? "Undated"}
        </h2>
        {g.themes.length > 0 && (
          <p className={`${ui.meta} ${p.themes}`}>
            {g.themes.map((t) => (
              <span key={t}>{`“${t}”`}</span>
            ))}
          </p>
        )}
        <p className={`${ui.meta} ${p.yearCount}`}>
          {g.n} {g.n === 1 ? "project" : "projects"}
        </p>
      </div>
      <div className={p.yearBody}>
        {lead && <Card e={lead} variant="lead" team={team} i={i++} eager={first} />}
        {pairs.map((e) => (
          <Card key={e.id} e={e} variant="build" team={team} i={i++} eager={first && i <= 2} />
        ))}
        {g.builds.length > 0 && g.films.length > 0 && <p className={`${ui.meta} ${p.filmsRule}`}>Films · {g.films.length}</p>}
        {g.films.map((e) => (
          <Card key={e.id} e={e} variant="film" i={i++} eager={first && g.builds.length === 0 && i <= 2} />
        ))}
      </div>
    </section>
  );
}

export default function ProjectsPage() {
  const headRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  const reduced = useReducedMotion();
  const phone = useMedia("(max-width: 759px)");
  const reel = useReel(REEL.length);

  const [params, setParams] = useSearchParams();
  const raw = params.get("team");
  const team = TEAMS.some((t) => t.id === raw) ? raw : null;
  const groups = useMemo(() => groupsFor(team), [team]);
  const live = new Set(groups.map((g) => g.year));
  const selected = TABS.find((t) => t.id === team);

  // ---- the console bar: stuck under the navbar? (a 1 px sentinel above it)
  const sentinelRef = useRef(null);
  const consoleRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const navH = useCallback(() => parseFloat(getComputedStyle(consoleRef.current).top) || 0, []);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const top = navH();
    const io = new IntersectionObserver(([en]) => setStuck(!en.isIntersecting && en.boundingClientRect.top < top + 1), {
      rootMargin: `-${top + 1}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [navH, phone]);

  // ---- the sliding indicator under the selected tab
  const listRef = useRef(null);
  const [ind, setInd] = useState(null);
  const measure = useCallback(() => {
    const tab = listRef.current?.querySelector('[aria-selected="true"]');
    if (tab) setInd((o) => ({ x: tab.offsetLeft, w: tab.offsetWidth, ready: Boolean(o) }));
  }, []);
  useLayoutEffect(measure, [measure, team, phone]);
  useEffect(() => {
    let off = false;
    document.fonts?.ready.then(() => !off && measure());
    window.addEventListener("resize", measure);
    return () => {
      off = true;
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // phones: keep the selected tab in view inside the scrolling tab row
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector('[aria-selected="true"]');
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  }, [team, reduced]);

  const choose = (id) => {
    if (id === team) return;
    setParams(id ? { team: id } : {}, { replace: true });
    // stuck: start the new result at its top (the bar stays where it is)
    const s = sentinelRef.current;
    if (s) {
      const top = s.getBoundingClientRect().top;
      const h = navH();
      if (top < h) window.scrollTo({ top: window.scrollY + top - h, behavior: "auto" });
    }
  };

  const onTabKey = (ev) => {
    const at = TABS.findIndex((t) => t.id === team);
    let to = null;
    if (ev.key === "ArrowRight") to = (at + 1) % TABS.length;
    else if (ev.key === "ArrowLeft") to = (at - 1 + TABS.length) % TABS.length;
    else if (ev.key === "Home") to = 0;
    else if (ev.key === "End") to = TABS.length - 1;
    if (to == null) return;
    ev.preventDefault();
    choose(TABS[to].id);
    document.getElementById(TABS[to].tabId)?.focus();
  };

  // ---- year jumps: the group on the viewport's 40 % line is the current one
  const catRef = useRef(null);
  const [now, setNow] = useState(null);
  useEffect(() => {
    const root = catRef.current;
    if (!root) return;
    const on = new Set();
    const io = new IntersectionObserver(
      (ens) => {
        for (const en of ens) {
          if (en.isIntersecting) on.add(en.target.dataset.year);
          else on.delete(en.target.dataset.year);
        }
        setNow(on.size ? [...on].pop() : null);
      },
      { rootMargin: "-40% 0px -60% 0px" },
    );
    root.querySelectorAll("[data-year]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [team]);

  const jump = (ev, year) => {
    ev.preventDefault();
    const h = document.getElementById(`y-${year}`);
    if (!h) return;
    h.closest("section")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    h.focus({ preventScroll: true });
  };

  return (
    <>
      <Navbar />
      <main className={ui.page}>
        <header ref={headRef} className={`${ui.pageHead} ${p.head}`} data-light="74% 40% 34vw">
          <div className={p.headGrid}>
            <div className={p.headCopy}>
              <div>
                <h1 className={ui.h1} data-reveal="head">
                  Projects
                </h1>
                <p className={`${ui.meta} ${p.counts}`} data-reveal>
                  {catalogSummary}
                </p>
              </div>
              {!phone && <Caption e={REEL[reel.cur]} i={reel.cur} />}
            </div>
            <ReelGate items={REEL} reel={reel} className={p.headGate} />
            {phone && <Caption e={REEL[reel.cur]} i={reel.cur} />}
          </div>
        </header>

        <div ref={sentinelRef} className={p.sentinel} aria-hidden="true" />
        <div ref={consoleRef} className={p.console} data-stuck={stuck ? "" : undefined}>
          <div className={p.consoleIn}>
            <div ref={listRef} className={`${ui.tabs} ${p.tabs}`} role="tablist" aria-label="Filter by team" onKeyDown={onTabKey}>
              {TABS.map((t) => {
                const on = t.id === team;
                return (
                  <button
                    key={t.tabId}
                    id={t.tabId}
                    type="button"
                    role="tab"
                    className={`${ui.tab} ${p.tab}`}
                    aria-selected={on}
                    aria-controls="v8-projects-catalogue"
                    tabIndex={on ? 0 : -1}
                    onClick={() => choose(t.id)}
                  >
                    {t.label}
                    <span className={p.tabN}>{t.n}</span>
                  </button>
                );
              })}
              {ind && (
                <span
                  className={`${p.ind} ${ind.ready ? p.indMove : ""}`}
                  style={{ width: ind.w, transform: `translateX(${ind.x}px)` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <nav className={p.jumps} aria-label="Years">
              {YEAR_JUMPS.map((y) => {
                const off = !live.has(y);
                return (
                  <a
                    key={y}
                    href={`#y-${y}`}
                    className={`${ui.meta} ${p.jump} ${String(y) === now ? p.jumpOn : ""}`}
                    aria-disabled={off || undefined}
                    tabIndex={off ? -1 : undefined}
                    onClick={(ev) => jump(ev, y)}
                  >
                    {y}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        <section ref={catRef} className={p.catalogue} id="v8-projects-catalogue" role="tabpanel" aria-labelledby={selected.tabId}>
          <div className={`${ui.wrap} ${p.catWrap}`}>
            <div className={p.filmRail} aria-hidden="true">
              <span className={p.playhead} />
            </div>
            <div key={team ?? "all"} className={p.groups}>
              {groups.map((g, gi) => (
                <YearGroup key={g.key} g={g} team={team} first={gi === 0} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
