// /team, version A · The Wall (research/v8-team-page.md §4–5). Every face on one wall, batch by
// batch, latest first, every tile the same size. At rest every portrait is the same grey with a
// breath of teal, so 192 mixed photos read as one print run; under the pointer (and the room's
// pool, which follows it) a face comes up to full colour. With every team shown, each batch lists
// the people who held a post first (a "Positions" group, the post under the name), then the rest
// ("Members"). Each batch opens with its year in display figures; a sticky year index beside the
// wall jumps (phones / tablets: year chips in the bar). The tiles are memoised: a hover only
// re-renders the dossier.
// Team tabs LIGHT one team (the rest dim and leave the tab order: "34 of 192 lit"), search
// NARROWS. Hover previews in the dossier, click (Enter / Space) pins (?p=), Esc unpins; on
// desktop a hairline with a ring end runs from the pinned face to the dossier (the Figma's
// leader line). Below 1100 px the dossier is a drawer / bottom sheet that opens on pin.
// Keyboard: the wall is one tab stop; arrows walk it (up / down by row), Home / End the batch,
// Page Up / Down the next batch.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../chrome/Navbar";
import { useMedia, useReducedMotion } from "../../lib/hooks";
import { P } from "../../lib/paths";
import { useReveal } from "../../lib/reveal";
import ui from "../../ui.module.css";
import { BATCHES, BLOCKS, BY_SLUG, STATS, TEAM_LABEL, matchSet, narrowBlocks, rolesOf } from "./data";
import Dossier from "./Dossier";
import Drawer from "./Drawer";
import { jumpTo, useActiveBatch, useArrivalJump, useBarHeight, useEscape, usePoolFollow, useTeamParams, walkGrid } from "./hooks";
import Portrait from "./Portrait";
import TeamBar, { SearchField } from "./TeamBar";
import sh from "./shared.module.css";
import w from "./wall.module.css";

const LIGHT = "84% 46% 26vw";
const LIGHT_NARROW = "70% 30% 40vw";

/** The pinned face → the dossier's portrait: one hairline, a ring at the face's end. */
function Leader({ slug, reduced }) {
  const lineRef = useRef(null);
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const svgRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = 0;
      const svg = svgRef.current;
      const card = document.querySelector(`[data-card][data-slug="${CSS.escape(slug)}"] [data-frame]`);
      const to = document.querySelector("[data-wall-aside] [data-dossier-frame]");
      if (!svg || !card || !to) return;
      const a = card.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const stick = document.querySelector("[data-team-bar]")?.getBoundingClientRect().bottom ?? 0;
      const y1 = a.top + Math.min(a.height / 2, 60);
      const visible = a.bottom > stick + 8 && a.top < window.innerHeight - 8 && a.width > 0;
      svg.style.opacity = visible ? "1" : "0";
      const x1 = a.right;
      const x2 = b.left - 6;
      const y2 = b.top + Math.min(b.height * 0.32, 140);
      const midX = Math.max(x1 + 12, x2 - 28);
      lineRef.current?.setAttribute("points", `${x1 + 5},${y1} ${midX},${y1} ${x2},${y2}`);
      ringRef.current?.setAttribute("cx", String(x1));
      ringRef.current?.setAttribute("cy", String(y1));
      dotRef.current?.setAttribute("cx", String(x2));
      dotRef.current?.setAttribute("cy", String(y2));
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    const t = window.setInterval(ask, 400); // the dossier's photo / text can change size
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", ask);
      window.clearInterval(t);
    };
  }, [slug]);
  return (
    <svg ref={svgRef} className={`${w.leader} ${reduced ? "" : w.leaderDraw}`} key={slug} aria-hidden="true" focusable="false">
      <polyline ref={lineRef} pathLength="1" />
      <circle ref={ringRef} r="5" className={w.leaderRing} />
      <circle ref={dotRef} r="2" className={w.leaderDot} />
    </svg>
  );
}

/**
 * The batches. With every team shown, each batch lists who held a post first ("Positions"), then
 * everyone else ("Members"); with one team lit, the roster's own order (team, post, name).
 * Memoised: hovering a face changes the dossier, not this.
 */
const Blocks = memo(function Blocks({ blocks, litSet, lightOne, none, pinned, roveSlug, hoverable, wide, setHover, setRove, onCard }) {
  return blocks.map((bl) => {
    const litHere = lightOne ? bl.people.filter((m) => litSet.has(m.slug)).length : 0;
    const posts = lightOne ? [] : bl.people.filter((m) => m.designation);
    const groups = posts.length
      ? [
          { id: "posts", label: "Positions", people: posts },
          { id: "members", label: "Members", people: bl.people.filter((m) => !m.designation) },
        ].filter((g) => g.people.length)
      : [{ id: "all", label: null, people: bl.people }];
    return (
      <section key={bl.batch} id={`v8-team-${bl.batch}`} data-batch={bl.batch} className={w.block} aria-labelledby={`v8-team-${bl.batch}-h`}>
        <header className={w.blockHead}>
          <h2 id={`v8-team-${bl.batch}-h`} className={w.blockYear}>
            <span className={ui.srOnly}>Batch of </span>
            {bl.batch}
          </h2>
          <p className={w.blockMeta}>{lightOne && !none ? `${litHere} of ${bl.people.length} lit` : `${bl.people.length} ${bl.people.length === 1 ? "person" : "people"}`}</p>
        </header>
        {groups.map((g) => (
          <div key={g.id} className={w.group}>
            {g.label && <h3 className={w.groupHead}>{g.label}</h3>}
            <ul className={w.cards}>
              {g.people.map((m, i) => {
                const roles = rolesOf(m.designation);
                const isLit = litSet.has(m.slug);
                const isPinned = pinned === m.slug;
                return (
                  <li key={m.slug} className={w.cell} style={{ "--i": Math.min(i, 12) }} data-dim={isLit ? undefined : ""} inert={!isLit}>
                    <button
                      type="button"
                      className={w.card}
                      data-card=""
                      data-slug={m.slug}
                      data-lights=""
                      data-off={isLit ? undefined : ""}
                      aria-pressed={isPinned}
                      tabIndex={m.slug === roveSlug ? 0 : -1}
                      onPointerEnter={hoverable ? () => setHover(m.slug) : undefined}
                      onFocus={() => {
                        setRove(m.slug);
                        if (wide) setHover(m.slug);
                      }}
                      onClick={() => onCard(m.slug)}
                    >
                      <Portrait member={m} duo className={w.frame}>
                        <span data-frame="" className={w.frameBox} aria-hidden="true" />
                      </Portrait>
                      <span className={w.name}>{m.name}</span>
                      {roles.length > 0 && (
                        <span className={w.post} title={m.designation}>
                          {roles.map((r) => r.role).join(" / ")}
                        </span>
                      )}
                      <span className={w.tag}>
                        <span className={w.tagTeam}>
                          {TEAM_LABEL[m.vertical]}
                          <span className={ui.srOnly}>, batch of {m.batch}</span>
                        </span>
                        {roles.some((r) => r.tenure) && (
                          <span className={w.tenure}>
                            <span className={ui.srOnly}>, </span>
                            {/* (the latest tenure; the full designation is the post's title) */}
                            {`’${roles.findLast((r) => r.tenure).tenure.slice(2)}`}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    );
  });
});

export default function Wall() {
  const mainRef = useRef(null);
  const headRef = useRef(null);
  const barRef = useRef(null);
  const wallRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  useBarHeight(barRef, mainRef);
  const reduced = useReducedMotion();
  const wide = useMedia("(min-width: 1100px)");
  const narrow = useMedia("(max-width: 759px)");
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const { v, b, pinned, query, setQuery, clearQuery, setTeam, pin, unpin, update } = useTeamParams();
  usePoolFollow(wallRef, fine && !reduced);
  useArrivalJump(b, update, reduced);
  useEscape(!!pinned && wide, unpin);

  // ---- what is shown, what is lit
  const matches = useMemo(() => matchSet(query), [query]);
  const none = matches?.size === 0;
  const blocks = useMemo(
    () => (matches && !none ? narrowBlocks(matches) : BLOCKS),
    [matches, none],
  );
  const shownList = useMemo(() => blocks.flatMap((bl) => bl.people), [blocks]);
  const litList = useMemo(() => (none ? [] : shownList.filter((m) => !v || m.vertical === v)), [shownList, v, none]);
  const litSet = useMemo(() => new Set(litList.map((m) => m.slug)), [litList]);
  const hits = useMemo(() => new Set(blocks.map((bl) => bl.batch)), [blocks]);

  const q = query.trim();
  let count = `${STATS.people} people`;
  if (none) count = "0 matches";
  else if (matches) count = `${matches.size} match “${q}”${v ? ` · ${litList.length} lit` : ""}`;
  else if (v) count = `${litList.length} of ${STATS.people} lit`;

  // ---- hover preview (desktop) and the pin
  const [hover, setHover] = useState(null);
  const pinnedMember = pinned ? BY_SLUG.get(pinned) : null;
  const hoverMember = hover && wide ? BY_SLUG.get(hover) : null;
  const shown = pinnedMember ?? hoverMember ?? null;
  const onCard = useCallback((slug) => (pinned === slug ? unpin() : pin(slug)), [pinned, pin, unpin]);

  // ---- roving focus: the wall is one tab stop
  const [rove, setRove] = useState(null);
  const roveSlug = rove && litSet.has(rove) ? rove : (litList[0]?.slug ?? null);

  const onWallKey = useCallback((e) => {
    const to = walkGrid(e, wallRef.current, "[data-card]", "[data-batch]");
    if (to) setRove(to.dataset.slug);
  }, []);

  // ---- years: the rail / chips jump; the one being read is marked
  const [active, setActive] = useActiveBatch(wallRef, `${blocks.length}:${q}`);
  // (instant: a long smooth scroll between batches reads as lag)
  const onJump = (y) => {
    setActive(y);
    jumpTo(y, true);
  };
  const off = useMemo(() => new Set(BATCHES.filter((y) => !hits.has(y))), [hits]);

  // ---- blocks below the fold fade up the first time they come into view; those already on
  // screen (on arrival, or after a search) are simply there
  useLayoutEffect(() => {
    const root = wallRef.current;
    if (!root) return undefined;
    const fresh = [...root.querySelectorAll("[data-batch]:not([data-in])")];
    if (reduced) {
      fresh.forEach((el) => el.setAttribute("data-in", ""));
      return undefined;
    }
    const h = window.innerHeight;
    const later = fresh.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < h && r.bottom > 0) {
        el.setAttribute("data-in", "");
        return false;
      }
      return true;
    });
    if (!later.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.setAttribute("data-fade", "");
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px 10% 0px" },
    );
    later.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduced, blocks]);

  const hint = wide ? "Click a face to pin it." : "";
  const dossier = (inDrawer) => (
    <Dossier
      member={inDrawer ? pinnedMember : shown}
      pinned={!!pinnedMember}
      team={v}
      onPin={pin}
      onClose={unpin}
      onTeam={setTeam}
      reduced={reduced}
      hint={hint}
      headingId={inDrawer ? "v8-team-dossier-h" : undefined}
      level={inDrawer ? "h2" : "p"}
    />
  );

  return (
    <>
      <Navbar />
      <main ref={mainRef} className={`${ui.page} ${sh.teamPage} ${reduced ? w.reduced : ""}`}>
        <header ref={headRef} className={`${ui.pageHead} ${w.head}`} data-light={narrow ? LIGHT_NARROW : LIGHT}>
          <div className={w.headGrid}>
            <h1 className={ui.h1} data-reveal="head">
              Team
            </h1>
            {narrow && <SearchField query={query} setQuery={setQuery} onClear={clearQuery} className={sh.headSearch} />}
          </div>
        </header>

        <TeamBar
          barRef={barRef}
          v={v}
          onTeam={setTeam}
          query={query}
          setQuery={setQuery}
          onClear={clearQuery}
          search={!narrow}
          years={wide ? null : { list: BATCHES, active, onJump, off }}
          count={count}
        />

        <section className={w.body} data-light={narrow ? LIGHT_NARROW : LIGHT} aria-label="The team, batch by batch">
          <div className={`${ui.wrap} ${w.grid}`}>
            {wide && (
              <nav className={w.rail} aria-label="Jump to a batch">
                <ol>
                  {BATCHES.map((y) => (
                    <li key={y}>
                      <button type="button" className={w.railYear} aria-current={active === y ? "true" : undefined} disabled={off.has(y)} onClick={() => onJump(y)}>
                        {y}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div
              ref={wallRef}
              className={`${w.wall} ${reduced ? "" : w.anim} ${none ? w.none : ""}`}
              onKeyDown={onWallKey}
              onPointerLeave={() => setHover(null)}
            >
              {none && (
                <p className={w.empty} role="status">
                  No one called “{q}”.{" "}
                  <button type="button" className={ui.link} onClick={clearQuery}>
                    Clear →
                  </button>
                </p>
              )}
              <Blocks blocks={blocks} litSet={litSet} lightOne={Boolean(v)} none={none} pinned={pinned} roveSlug={roveSlug} hoverable={fine && wide} wide={wide} setHover={setHover} setRove={setRove} onCard={onCard} />
            </div>

            {wide && (
              <aside className={w.aside} aria-label="Who this is" data-wall-aside="">
                {dossier(false)}
              </aside>
            )}
          </div>

          <div className={`${ui.wrap} ${w.closing}`}>
            <Link to={P("/about")} className={ui.link}>
              How the five teams work →
            </Link>
            <Link to={P("/alumni")} className={ui.link}>
              Where the alumni went →
            </Link>
          </div>
        </section>

        {wide && pinned && <Leader slug={pinned} reduced={reduced} />}
      </main>
      {/* outside <main>: its z-index (ui.page) would keep the drawer under the navbar */}
      {!wide && (
        <Drawer open={!!pinnedMember} onClose={unpin} labelledBy="v8-team-dossier-h" reduced={reduced}>
          {pinnedMember && dossier(true)}
        </Drawer>
      )}
    </>
  );
}
