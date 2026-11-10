// /team · Current: the roster (research/v8-team-hero.md §1.3). One ledger of everyone on record, a hairline
// row per person (year printed once per batch, a small 3:4 thumb, name, role, team, links), a
// sticky filter bar (team tabs, batch, search, live count; all in the URL: ?v= ?b= ?q=) and, on
// desktop, a sticky 3:4 viewer where the pool of light sits: the row under the pointer or
// keyboard focus is the one slide in the projector (none when nothing matches). Phones: no
// viewer; each row's summary is a button that opens its links.
// Links are brand glyphs (always; the "Socials" knob is gone). Kept as the "Current" version of
// /team so the user can compare it with A · Wall, B · Credits and C · Lineage (controls.ts, ?team=).
// Sticky works because V8 un-scroll-containers its ancestors (v8.module.css; team.module.css
// covers <body> while this page is mounted).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { batches, team, verticals } from "../../../../immersive/data";
import Navbar from "../../chrome/Navbar";
import SocialIcon from "../../chrome/SocialIcon";
import { TEAMS, TEAM_ORDER } from "../../home/teamStills";
import { useMedia, useReducedMotion } from "../../lib/hooks";
import { P } from "../../lib/paths";
import { useReveal } from "../../lib/reveal";
import ui from "../../ui.module.css";
import s from "./current.module.css";

const TEAM_LABEL = Object.fromEntries(verticals.map((v) => [v.id, v.label]));
const TEAM_RANK = Object.fromEntries(TEAM_ORDER.map((id, i) => [id, i]));
const SOCIALS = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter", brand: "X (Twitter)" },
  { key: "dribbble", label: "Dribbble" },
  { key: "behance", label: "Behance" },
  { key: "facebook", label: "Facebook" },
];
const hasLinks = (m) => SOCIALS.some((x) => m.socials?.[x.key]);
/** Glyph size (px): the roster's rows, the viewer. */
const ICON_ROW = 16;
const ICON_VIEWER = 18;
const LIGHT = "84% 41% 26vw";
const LIGHT_NARROW = "80% 22% 36vw";
const SEARCH_DEBOUNCE = 120;

const fold = (str) =>
  String(str ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/** Everyone, in the one order the page ever uses: batch descending, then team, then name. */
const ROSTER = [...team]
  .sort((a, b) => b.batch - a.batch || (TEAM_RANK[a.vertical] ?? 9) - (TEAM_RANK[b.vertical] ?? 9) || a.name.localeCompare(b.name))
  .map((m) => ({ m, hay: fold(`${m.name} ${m.designation ?? ""} ${TEAM_LABEL[m.vertical] ?? ""} ${m.batch}`) }));

/**
 * A member's links: one glyph per link, each in the same fixed box (so the custom cursor locks
 * onto every one alike and a row's set lines up from the right whatever its length).
 */
function Links({ member, size = ICON_ROW, className = "", id }) {
  const list = SOCIALS.filter((x) => member.socials?.[x.key]);
  if (!list.length) return null;
  return (
    <span id={id} className={`${s.links} ${s.icons} ${className}`}>
      {list.map((x) => {
        const brand = x.brand ?? x.label;
        return (
          <a
            key={x.key}
            href={member.socials[x.key]}
            target="_blank"
            rel="noreferrer"
            className={s.linkIcon}
            aria-label={`${brand} — ${member.name}`}
            title={brand}
            data-cursor="lock"
          >
            <SocialIcon name={x.key} size={size} />
          </a>
        );
      })}
    </span>
  );
}

function Thumb({ member }) {
  const [failed, setFailed] = useState(!member.photo);
  return (
    <span className={`${ui.frame} ${s.thumb}`}>
      {failed ? (
        <span className={`${ui.initial} ${s.thumbInitial}`} aria-hidden="true">
          {member.name.charAt(0)}
        </span>
      ) : (
        <img src={member.photo} alt="" width="36" height="48" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

/**
 * The projector's slide: two stacked images so a change crossfades (instant under reduced motion).
 * The viewer owns the portrait's loading; it is only mounted while there is a member to show.
 */
function Viewer({ member, reduced }) {
  const seq = useRef(0);
  const [layers, setLayers] = useState(() => [{ id: ++seq.current, m: member, ready: true, failed: !member.photo }]);

  useEffect(() => {
    setLayers((ls) => {
      if (ls.at(-1)?.m.slug === member.slug) return ls;
      // keep the newest slide that is already showing underneath, drop anything older
      const under = ls.filter((l) => l.ready).slice(-1);
      return [...under, { id: ++seq.current, m: member, ready: !member.photo, failed: !member.photo }];
    });
  }, [member]);

  const settle = useCallback((id) => setLayers((ls) => ls.slice(Math.max(0, ls.findIndex((l) => l.id === id)))), []);
  const onReady = (id, failed = false) => {
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ready: true, failed: l.failed || failed } : l)));
    if (reduced) settle(id);
  };

  const top = layers.at(-1);
  if (!top) return null;
  const m = top.m;
  return (
    <>
      <div className={`${ui.frame} ${s.viewerFrame}`}>
        {layers.map((l) =>
          l.failed ? (
            <span
              key={l.id}
              className={`${s.viewerLayer} ${l.ready ? s.isReady : ""}`}
              onTransitionEnd={(e) => e.target === e.currentTarget && settle(l.id)}
              aria-hidden="true"
            >
              <span className={ui.initial}>{l.m.name.charAt(0)}</span>
            </span>
          ) : (
            <img
              key={l.id}
              className={`${s.viewerLayer} ${l.ready ? s.isReady : ""}`}
              src={l.m.photo}
              alt={l === top ? `Portrait of ${l.m.name}` : ""}
              decoding="async"
              onLoad={() => onReady(l.id)}
              onError={() => onReady(l.id, true)}
              onTransitionEnd={(e) => e.propertyName === "opacity" && settle(l.id)}
            />
          ),
        )}
      </div>
      <div className={s.viewerText}>
        <p className={`${ui.h3} ${s.viewerName}`}>{m.name}</p>
        {m.designation && <p className={s.viewerRole}>{m.designation}</p>}
        <p className={s.viewerMeta}>
          Batch {m.batch} · {TEAM_LABEL[m.vertical]}
        </p>
        <Links member={m} size={ICON_VIEWER} className={s.viewerLinks} />
      </div>
    </>
  );
}

export default function Current() {
  const headRef = useRef(null);
  const barRef = useRef(null);
  const mainRef = useRef(null);
  const rosterRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  const reduced = useReducedMotion();
  const narrow = useMedia("(max-width: 759px)");
  const fine = useMedia("(pointer: fine)");

  // ---- URL state
  const [params, setParams] = useSearchParams();
  const vParam = params.get("v");
  const bParam = Number.parseInt(params.get("b") ?? "", 10);
  const qParam = params.get("q") ?? "";
  const v = TEAMS.some((t) => t.id === vParam) ? vParam : null;
  const b = batches.includes(bParam) ? bParam : null;
  const update = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, val] of Object.entries(patch)) {
            if (val === null || val === undefined || val === "") next.delete(k);
            else next.set(k, String(val));
          }
          return next;
        },
        { replace: true, preventScrollReset: true },
      ),
    [setParams],
  );

  // search: filter on every keystroke, write ?q= after a short pause
  const [query, setQuery] = useState(qParam);
  const written = useRef(qParam);
  useEffect(() => {
    // the URL changed from outside (back / forward): follow it
    if (qParam !== written.current) {
      written.current = qParam;
      setQuery(qParam);
    }
  }, [qParam]);
  useEffect(() => {
    if (query === written.current) return;
    const t = window.setTimeout(() => {
      written.current = query;
      update({ q: query.trim() ? query : null });
    }, SEARCH_DEBOUNCE);
    return () => window.clearTimeout(t);
  }, [query, update]);
  const clearSearch = () => {
    setQuery("");
    written.current = "";
    update({ q: null });
  };
  const showEveryone = () => {
    setQuery("");
    written.current = "";
    update({ q: null, v: null, b: null });
  };

  const shown = useMemo(() => {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    return ROSTER.filter(({ m, hay }) => (!v || m.vertical === v) && (!b || m.batch === b) && terms.every((t) => hay.includes(t))).map((r) => r.m);
  }, [v, b, query]);

  // ---- the lit row: pointer (fine) or focus; otherwise the last lit one; initially the first
  const [lit, setLit] = useState(null);
  const litMember = shown.find((m) => m.slug === lit) ?? shown[0] ?? null;
  const light = (m) => setLit(m.slug);

  // ---- phones: one open row at a time
  const [open, setOpen] = useState(null);
  const toggle = (slug) => setOpen((o) => (o === slug ? null : slug));

  // ---- the bar's real height (the viewer sticks under it)
  useLayoutEffect(() => {
    const bar = barRef.current;
    const main = mainRef.current;
    if (!bar || !main) return;
    const set = () => main.style.setProperty("--bar-h", `${Math.round(bar.offsetHeight)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // ---- keyboard: arrows / Home / End walk the rows (the row itself on desktop, its toggle
  // button on phones); Tab still walks the links inside a row
  const onRowKey = (e) => {
    if (e.target !== e.currentTarget) return;
    const rows = [...(rosterRef.current?.querySelectorAll("[data-row]") ?? [])];
    const i = rows.indexOf(e.currentTarget);
    let to = null;
    if (e.key === "ArrowDown") to = rows[Math.min(rows.length - 1, i + 1)];
    else if (e.key === "ArrowUp") to = rows[Math.max(0, i - 1)];
    else if (e.key === "Home") to = rows[0];
    else if (e.key === "End") to = rows.at(-1);
    if (to) {
      e.preventDefault();
      to.focus();
      to.scrollIntoView({ block: "nearest" });
    }
  };

  const total = team.length;
  const lightAt = narrow ? LIGHT_NARROW : LIGHT;

  let prevBatch = null;
  return (
    <>
      <Navbar />
      <main ref={mainRef} className={`${ui.page} ${s.page} ${reduced ? s.reduced : ""}`}>
        <header ref={headRef} className={ui.pageHead} data-light={lightAt}>
          <div>
            <h1 className={ui.h1} data-reveal="head">
              Team
            </h1>
          </div>
        </header>

        <div ref={barRef} className={s.bar}>
          <div className={`${ui.wrap} ${s.barGrid}`}>
            <div className={`${ui.tabs} ${s.tabs}`} role="tablist" aria-label="Team">
              <button type="button" role="tab" className={ui.tab} aria-selected={!v} onClick={() => update({ v: null })}>
                All
              </button>
              {TEAMS.map((t) => (
                <button key={t.id} type="button" role="tab" className={ui.tab} aria-selected={v === t.id} onClick={() => update({ v: t.id })}>
                  {t.label}
                </button>
              ))}
            </div>

            {narrow ? (
              <select
                className={`${ui.input} ${s.batchSelect}`}
                value={b ?? ""}
                onChange={(e) => update({ b: e.target.value || null })}
                aria-label="Batch"
              >
                <option value="">All batches</option>
                {batches.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            ) : (
              <div className={s.batches} role="group" aria-label="Batch">
                <button type="button" className={s.batchBtn} aria-pressed={!b} onClick={() => update({ b: null })}>
                  All
                </button>
                {batches.map((y) => (
                  <button key={y} type="button" className={s.batchBtn} aria-pressed={b === y} onClick={() => update({ b: y })}>
                    {y}
                  </button>
                ))}
              </div>
            )}

            <input
              type="search"
              className={`${ui.input} ${s.search}`}
              placeholder="Search names or roles"
              aria-label="Search the team"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  clearSearch();
                }
              }}
            />

            <p className={s.count} aria-live="polite">
              {shown.length} of {total}
              {shown.length === 0 ? " · nothing matches" : ""}
            </p>
          </div>
        </div>

        <section className={s.body} data-light={lightAt} aria-label="Roster">
          <div className={`${ui.wrap} ${s.bodyGrid}`}>
            <ol ref={rosterRef} className={`${s.roster} ${v ? s.oneTeam : ""}`}>
              {shown.length === 0 && (
                <li className={s.empty}>
                  No one matches.{" "}
                  {(v || b) && (
                    <button type="button" className={ui.link} onClick={showEveryone}>
                      Show everyone →
                    </button>
                  )}
                  {query.trim() && !(v || b) && (
                    <button type="button" className={ui.link} onClick={clearSearch}>
                      Clear the search →
                    </button>
                  )}
                </li>
              )}
              {shown.map((m) => {
                const first = m.batch !== prevBatch;
                prevBatch = m.batch;
                const isLit = litMember?.slug === m.slug;
                const isOpen = narrow && open === m.slug;
                const role = narrow ? [v ? null : TEAM_LABEL[m.vertical], m.designation].filter(Boolean).join(" · ") : m.designation;
                const linksId = `v8-links-${m.slug}`;
                return (
                  <li
                    key={m.slug}
                    data-row={narrow ? undefined : ""}
                    data-slug={m.slug}
                    tabIndex={narrow ? undefined : 0}
                    className={`${s.row} ${first ? s.groupStart : ""} ${isLit && !narrow ? s.lit : ""} ${isOpen ? s.open : ""}`}
                    onPointerEnter={fine && !narrow ? () => light(m) : undefined}
                    onFocus={narrow ? undefined : () => light(m)}
                    onKeyDown={narrow ? undefined : onRowKey}
                  >
                    {narrow && hasLinks(m) && (
                      // the row's tap target: a real button over the summary (the links sit above it)
                      <button
                        type="button"
                        data-row=""
                        data-cursor="link"
                        className={s.rowToggle}
                        aria-expanded={isOpen}
                        aria-controls={linksId}
                        aria-label={`${m.name}${role ? `, ${role}` : ""}, batch ${m.batch}: links`}
                        onClick={() => toggle(m.slug)}
                        onKeyDown={onRowKey}
                      />
                    )}
                    <span className={s.year}>{first ? m.batch : ""}</span>
                    <Thumb member={m} />
                    <span className={s.who}>
                      <span className={s.name}>{m.name}</span>
                      {role && <span className={s.role}>{role}</span>}
                    </span>
                    <span className={s.team}>{TEAM_LABEL[m.vertical]}</span>
                    <Links member={m} className={s.rowLinks} id={narrow ? linksId : undefined} />
                    <span className={s.yearEnd} aria-hidden="true">
                      {m.batch}
                    </span>
                  </li>
                );
              })}
            </ol>

            {!narrow && (
              <aside className={s.viewer} aria-label="Selected member">
                {litMember && <Viewer member={litMember} reduced={reduced} />}
              </aside>
            )}
          </div>

          <div className={`${ui.wrap} ${s.closing}`}>
            <Link to={P("/about")} className={ui.link}>
              How the five teams work →
            </Link>
            <Link to={P("/projects")} className={ui.link}>
              Selected work →
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
