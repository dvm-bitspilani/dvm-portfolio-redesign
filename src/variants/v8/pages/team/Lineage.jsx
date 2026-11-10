// /team, version C · The Lineage board (research/v8-team-page.md §4, Concept C). One picture of
// the department's structure: the five teams as lanes (rows) across the eight batches (columns,
// oldest first, as a timeline reads), each cell the faces who joined that team that year. Read a
// lane along to see a team grow; read a column down to see a year's intake. Two hairlines with
// ring ends (the Figma's leader lines, the Legacy graph's edges) trace who ran the work year to
// year: the Creative Heads and the Projects Heads. Hover a face and the readout over the board
// says who it is; click opens the dossier (a panel from the right; a bottom sheet on phones).
// Team tabs light one lane, search lights the matches; nothing leaves the board.
// 760–1099 px: the board turns on its side (batches as rows, teams as columns) so it fits
// without panning; phones: one lane after another, a row per batch.
// Keyboard: the board is one tab stop; arrows walk it, Home / End the lane, Page Up / Down the
// next lane.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../chrome/Navbar";
import { useMedia, useReducedMotion } from "../../lib/hooks";
import { P } from "../../lib/paths";
import { useReveal } from "../../lib/reveal";
import ui from "../../ui.module.css";
import { BOARD, BY_SLUG, CHAINS, ROSTER, STATS, TEAM_LABEL, YEARS_ASC, matchSet, rolesOf } from "./data";
import Dossier from "./Dossier";
import Drawer from "./Drawer";
import { useBarHeight, usePoolFollow, useTeamParams, walkGrid } from "./hooks";
import Portrait from "./Portrait";
import TeamBar, { SearchField } from "./TeamBar";
import sh from "./shared.module.css";
import l from "./lineage.module.css";

const LIGHT = "50% 55% 40vw";
const LIGHT_NARROW = "50% 30% 44vw";
const pad2 = (n) => String(n).padStart(2, "0");
const INTAKE = Object.fromEntries(YEARS_ASC.map((y) => [y, ROSTER.filter((m) => m.batch === y).length]));
const CHAIN_OF = new Map(CHAINS.flatMap((c) => c.people.map((m) => [m.slug, c.id])));

/** The heads, year to year: a hairline through their faces, a ring at each end. */
function Chains({ boardRef, lit }) {
  const [paths, setPaths] = useState([]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const b = board.getBoundingClientRect();
      setPaths(
        CHAINS.map((c) => {
          const pts = c.people
            .map((m) => board.querySelector(`[data-thumb][data-slug="${CSS.escape(m.slug)}"]`))
            .filter(Boolean)
            .map((el) => {
              const r = el.getBoundingClientRect();
              return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2, r: Math.max(r.width, r.height) / 2 };
            });
          return { id: c.id, label: c.label, pts };
        }),
      );
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(ask);
    ro.observe(board);
    document.fonts?.ready?.then(ask);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [boardRef]);
  return (
    <svg className={l.chains} aria-hidden="true" focusable="false">
      {paths.map((p) =>
        p.pts.length > 1 ? (
          <g key={p.id} className={l.chain} data-lit={lit === p.id ? "" : undefined} data-chain={p.id}>
            <polyline points={p.pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")} />
            {p.pts.map((q, i) => (
              <circle key={i} cx={q.x} cy={q.y} r={i === 0 || i === p.pts.length - 1 ? 5 : 2.5} className={i === 0 || i === p.pts.length - 1 ? l.ring : l.node} />
            ))}
          </g>
        ) : null,
      )}
    </svg>
  );
}

export default function Lineage() {
  const mainRef = useRef(null);
  const headRef = useRef(null);
  const barRef = useRef(null);
  const boardRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  useBarHeight(barRef, mainRef);
  const reduced = useReducedMotion();
  const narrow = useMedia("(max-width: 759px)");
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const { v, pinned, query, setQuery, clearQuery, setTeam, pin, unpin } = useTeamParams();
  usePoolFollow(boardRef, fine && !reduced, 0.16);

  const matches = useMemo(() => matchSet(query), [query]);
  const none = matches?.size === 0;
  const litSet = useMemo(() => new Set(ROSTER.filter((m) => (!v || m.vertical === v) && (!matches || matches.has(m.slug))).map((m) => m.slug)), [v, matches]);

  const q = query.trim();
  let count = `${STATS.people} people · ${STATS.teams} teams · ${STATS.batches} batches`;
  if (none) count = "0 matches";
  else if (matches) count = `${litSet.size} match “${q}”`;
  else if (v) count = `${litSet.size} of ${STATS.people} lit`;

  const [hover, setHover] = useState(null);
  const [chain, setChain] = useState(null);
  const pinnedMember = pinned ? BY_SLUG.get(pinned) : null;
  const read = hover ? BY_SLUG.get(hover) : null;

  const [rove, setRove] = useState(null);
  const firstLit = useMemo(() => BOARD.flatMap((lane) => lane.cells.flatMap((c) => c.people)).find((m) => litSet.has(m.slug))?.slug ?? null, [litSet]);
  const roveSlug = rove && litSet.has(rove) ? rove : firstLit;
  const onKey = useCallback((e) => {
    const to = walkGrid(e, boardRef.current, "[data-thumb]", "[data-lane]");
    if (to) setRove(to.dataset.slug);
  }, []);

  const roles = read ? rolesOf(read.designation) : [];

  return (
    <>
      <Navbar />
      <main ref={mainRef} className={`${ui.page} ${sh.teamPage}`}>
        <header ref={headRef} className={ui.pageHead} data-light={narrow ? LIGHT_NARROW : LIGHT}>
          <div>
            <h1 className={ui.h1} data-reveal="head">
              Team
            </h1>
            {narrow && <SearchField query={query} setQuery={setQuery} onClear={clearQuery} className={sh.headSearch} />}
          </div>
        </header>

        <TeamBar barRef={barRef} v={v} onTeam={setTeam} query={query} setQuery={setQuery} onClear={clearQuery} search={!narrow} count={count} />

        <section className={l.body} data-light={narrow ? LIGHT_NARROW : LIGHT} aria-label="The five teams across eight batches">
          <div className={ui.wrap}>
            <div className={l.readout}>
              <p className={l.readLine} aria-hidden="true">
                {read ? (
                  <>
                    <span className={l.readName}>{read.name}</span>
                    {roles.map((r) => (
                      <span key={r.role + r.tenure} className={l.readRole}>
                        {r.role} <i>{r.tenure}</i>
                      </span>
                    ))}
                    <span className={l.readMeta}>
                      {TEAM_LABEL[read.vertical]} · {read.batch}
                    </span>
                  </>
                ) : (
                  <span className={l.readIdle}>{fine ? "Hover a face to read it; click for the dossier." : "Tap a face for the dossier."}</span>
                )}
              </p>
              <ul className={l.legend} aria-label="Who ran the work">
                {CHAINS.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={l.legendBtn}
                      aria-pressed={chain === c.id}
                      onClick={() => setChain((x) => (x === c.id ? null : c.id))}
                      onPointerEnter={fine ? () => setChain(c.id) : undefined}
                      onPointerLeave={fine ? () => setChain(null) : undefined}
                    >
                      <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true" focusable="false">
                        <line x1="5" y1="5" x2="23" y2="5" />
                        <circle cx="5" cy="5" r="3.5" />
                        <circle cx="23" cy="5" r="3.5" />
                      </svg>
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {none && (
              <p className={l.empty} role="status">
                No one called “{q}”.{" "}
                <button type="button" className={ui.link} onClick={clearQuery}>
                  Clear →
                </button>
              </p>
            )}

            <div
              ref={boardRef}
              className={`${l.board} ${chain ? l.chainOn : ""}`}
              data-chain={chain ?? undefined}
              onKeyDown={onKey}
              onPointerLeave={() => setHover(null)}
            >
              <div className={l.corner} aria-hidden="true">
                <span className={l.across}>Team ↓</span>
                <span className={l.across}>Batch →</span>
                <span className={l.down}>Batch ↓</span>
                <span className={l.down}>Team →</span>
              </div>
              {YEARS_ASC.map((y, yi) => (
                <div key={y} className={l.yearHead} style={{ "--y": yi }}>
                  <span className={l.yearNum}>{y}</span>
                  <span className={l.yearCount}>{INTAKE[y]} joined</span>
                </div>
              ))}
              {BOARD.map((lane, ti) => {
                const dim = v && v !== lane.id;
                return (
                  <Fragment key={lane.id}>
                    <div className={l.laneHead} style={{ "--t": ti }} data-dim={dim ? "" : undefined}>
                      <h2 className={l.laneName}>{lane.label}</h2>
                      <span className={l.laneCount}>{lane.total} people</span>
                    </div>
                    {lane.cells.map((cell, yi) => (
                      <div
                        key={cell.batch}
                        className={l.cell}
                        style={{ "--t": ti, "--y": yi }}
                        data-lane={lane.id}
                        data-empty={cell.people.length ? undefined : ""}
                        data-dim={dim ? "" : undefined}
                        role="group"
                        aria-label={`${lane.label}, batch of ${cell.batch}: ${cell.people.length} ${cell.people.length === 1 ? "person" : "people"}`}
                      >
                        <span className={l.cellYear} aria-hidden="true">
                          {cell.batch}
                        </span>
                        <span className={l.cellCount} aria-hidden="true">
                          {cell.people.length ? pad2(cell.people.length) : "—"}
                        </span>
                        {cell.people.length > 0 && (
                          <ul className={l.thumbs}>
                            {cell.people.map((m) => {
                              const isLit = litSet.has(m.slug);
                              const r = rolesOf(m.designation);
                              return (
                                <li key={m.slug}>
                                  <button
                                    type="button"
                                    className={l.thumb}
                                    data-thumb=""
                                    data-slug={m.slug}
                                    data-lights=""
                                    data-off={isLit ? undefined : ""}
                                    data-role={r.length ? "" : undefined}
                                    data-chain={CHAIN_OF.get(m.slug)}
                                    data-lit={hover === m.slug || pinned === m.slug ? "" : undefined}
                                    aria-pressed={pinned === m.slug}
                                    aria-label={`${m.name}${m.designation ? `, ${m.designation}` : ""}`}
                                    tabIndex={m.slug === roveSlug ? 0 : -1}
                                    inert={!isLit}
                                    onPointerEnter={fine ? () => setHover(m.slug) : undefined}
                                    onFocus={() => {
                                      setRove(m.slug);
                                      setHover(m.slug);
                                    }}
                                    onClick={() => pin(m.slug)}
                                  >
                                    <Portrait member={m} duo />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </Fragment>
                );
              })}
              {!narrow && <Chains boardRef={boardRef} lit={chain} />}
            </div>

            <div className={l.closing}>
              <Link to={P("/about")} className={ui.link}>
                How the five teams work →
              </Link>
              <Link to={P("/alumni")} className={ui.link}>
                Where the alumni went →
              </Link>
            </div>
          </div>
        </section>

      </main>
      {/* outside <main>: its z-index (ui.page) would keep the drawer under the navbar */}
      <Drawer open={!!pinnedMember} onClose={unpin} labelledBy="v8-team-dossier-h" reduced={reduced}>
        {pinnedMember && (
          <Dossier
            member={pinnedMember}
            pinned
            team={v}
            onPin={pin}
            onClose={unpin}
            onTeam={setTeam}
            reduced={reduced}
            hint=""
            headingId="v8-team-dossier-h"
            level="h2"
          />
        )}
      </Drawer>
    </>
  );
}
