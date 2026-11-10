// /team, version B · The Credits (research/v8-team-page.md §4, Concept B). Type-led, like the end
// credits of a film: each batch is a reel that opens on its year as an outlined display numeral
// (the Figma's ghost title), then team by team, a centred section head and the names set large;
// whoever held a post has it on the left of the axis, as a credit. Hover a name and its portrait
// comes up in a frame that follows the cursor (the others dim: the Figma's "play with
// opacities" note); click pins it into the dossier (right column on desktop, a drawer below
// 1100 px). Team tabs light one team, years jump, search narrows. Keyboard: the credits are one
// tab stop; arrows walk them, Home / End the batch, Page Up / Down the next batch; focus
// previews in the dossier.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../chrome/Navbar";
import { useMedia, useReducedMotion } from "../../lib/hooks";
import { P } from "../../lib/paths";
import { useReveal } from "../../lib/reveal";
import ui from "../../ui.module.css";
import { BATCHES, BLOCKS, BY_SLUG, STATS, TEAM_LABEL, TEAM_ORDER, matchSet, narrowBlocks, rolesOf } from "./data";
import Dossier from "./Dossier";
import Drawer from "./Drawer";
import { jumpTo, useActiveBatch, useArrivalJump, useBarHeight, useEscape, usePoolFollow, useTeamParams, walkGrid } from "./hooks";
import Portrait from "./Portrait";
import TeamBar, { SearchField } from "./TeamBar";
import sh from "./shared.module.css";
import c from "./credits.module.css";

const LIGHT = "40% 40% 30vw";
const LIGHT_NARROW = "50% 30% 40vw";
const FOLLOW_W = 176;
const FOLLOW_H = 234;

/** The hovered name's portrait, in a frame that trails the pointer (fine pointers only). */
function Follower({ member, reduced }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = { x: -999, y: -999, tx: -999, ty: -999, raf: 0, last: 0, placed: false };
    const place = () => {
      // right of the pointer, or left of it near the right edge; never off the top or bottom
      const flip = st.px + 32 + FOLLOW_W > window.innerWidth - 16;
      st.tx = flip ? st.px - 32 - FOLLOW_W : st.px + 32;
      st.ty = Math.min(Math.max(st.py - FOLLOW_H / 2, 84), window.innerHeight - FOLLOW_H - 16);
    };
    const frame = (t) => {
      const dt = st.last ? Math.min(64, t - st.last) : 16;
      st.last = t;
      const k = reduced ? 1 : 1 - Math.exp(-dt / 90);
      st.x += (st.tx - st.x) * k;
      st.y += (st.ty - st.y) * k;
      el.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0)`;
      if (Math.abs(st.tx - st.x) > 0.3 || Math.abs(st.ty - st.y) > 0.3) st.raf = requestAnimationFrame(frame);
      else {
        st.raf = 0;
        st.last = 0;
      }
    };
    const onMove = (e) => {
      st.px = e.clientX;
      st.py = e.clientY;
      place();
      if (!st.placed) {
        st.placed = true;
        st.x = st.tx;
        st.y = st.ty;
      }
      if (!st.raf) st.raf = requestAnimationFrame(frame);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(st.raf);
    };
  }, [reduced]);
  return (
    <div ref={ref} className={c.follow} data-on={member ? "" : undefined} aria-hidden="true">
      {member && (
        <>
          <Portrait key={member.slug} member={member} eager className={c.followFrame} />
          <span className={c.followCap}>
            {TEAM_LABEL[member.vertical]} · {member.batch}
          </span>
        </>
      )}
    </div>
  );
}

export default function Credits() {
  const mainRef = useRef(null);
  const headRef = useRef(null);
  const barRef = useRef(null);
  const listRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  useBarHeight(barRef, mainRef);
  const reduced = useReducedMotion();
  const wide = useMedia("(min-width: 1100px)");
  const narrow = useMedia("(max-width: 759px)");
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const { v, b, pinned, query, setQuery, clearQuery, setTeam, pin, unpin, update } = useTeamParams();
  usePoolFollow(listRef, fine && !reduced, 0.16);
  useArrivalJump(b, update, reduced);
  useEscape(!!pinned && wide, unpin);

  const matches = useMemo(() => matchSet(query), [query]);
  const none = matches?.size === 0;
  const reels = useMemo(() => {
    const src = matches && !none ? narrowBlocks(matches) : BLOCKS;
    return src.map((bl) => ({
      ...bl,
      groups: TEAM_ORDER.map((id) => ({ id, people: bl.people.filter((m) => m.vertical === id) })).filter((g) => g.people.length),
    }));
  }, [matches, none]);
  const shownList = useMemo(() => reels.flatMap((r) => r.groups.flatMap((g) => g.people)), [reels]);
  const litList = useMemo(() => (none ? [] : shownList.filter((m) => !v || m.vertical === v)), [shownList, v, none]);
  const litSet = useMemo(() => new Set(litList.map((m) => m.slug)), [litList]);
  const hits = useMemo(() => new Set(reels.map((r) => r.batch)), [reels]);

  const q = query.trim();
  let count = `${STATS.people} names`;
  if (none) count = "0 matches";
  else if (matches) count = `${matches.size} match “${q}”${v ? ` · ${litList.length} lit` : ""}`;
  else if (v) count = `${litList.length} of ${STATS.people} lit`;

  const [hover, setHover] = useState(null);
  const [focus, setFocus] = useState(null);
  const pinnedMember = pinned ? BY_SLUG.get(pinned) : null;
  const focusMember = focus && wide ? BY_SLUG.get(focus) : null;
  const hoverMember = hover && fine ? BY_SLUG.get(hover) : null;

  const [rove, setRove] = useState(null);
  const roveSlug = rove && litSet.has(rove) ? rove : (litList[0]?.slug ?? null);
  const onKey = useCallback((e) => {
    const to = walkGrid(e, listRef.current, "[data-credit]", "[data-batch]");
    if (to) setRove(to.dataset.slug);
  }, []);

  const [active, setActive] = useActiveBatch(listRef, `${reels.length}:${q}`);
  const onJump = (y) => {
    setActive(y);
    jumpTo(y, reduced);
  };
  const off = useMemo(() => new Set(BATCHES.filter((y) => !hits.has(y))), [hits]);

  const hint = wide ? "Click a name to pin it." : "";
  const dossier = (inDrawer) => (
    <Dossier
      member={inDrawer ? pinnedMember : (pinnedMember ?? focusMember ?? null)}
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
      <main ref={mainRef} className={`${ui.page} ${sh.teamPage}`}>
        <header ref={headRef} className={ui.pageHead} data-light={narrow ? LIGHT_NARROW : LIGHT}>
          <div>
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
          years={{ list: BATCHES, active, onJump, off }}
          count={count}
        />

        <section className={c.body} data-light={narrow ? LIGHT_NARROW : LIGHT} aria-label="The credits, batch by batch">
          <div className={`${ui.wrap} ${c.grid}`}>
            <div
              ref={listRef}
              className={`${c.credits} ${none ? c.none : ""}`}
              onKeyDown={onKey}
              onPointerLeave={() => setHover(null)}
            >
              {none && (
                <p className={c.empty} role="status">
                  No one called “{q}”.{" "}
                  <button type="button" className={ui.link} onClick={clearQuery}>
                    Clear →
                  </button>
                </p>
              )}
              {reels.map((r) => {
                const roleCount = r.people.filter((m) => m.designation).length;
                return (
                  <section key={r.batch} id={`v8-team-${r.batch}`} data-batch={r.batch} className={c.reel} aria-labelledby={`v8-team-${r.batch}-h`}>
                    <header className={c.reelHead}>
                      <p className={c.reelKicker}>Batch of</p>
                      <h2 id={`v8-team-${r.batch}-h`} className={c.reelYear}>
                        <span className={ui.srOnly}>Batch of </span>
                        {r.batch}
                      </h2>
                      <p className={c.reelMeta}>
                        {r.people.length} {r.people.length === 1 ? "name" : "names"}
                        {roleCount > 0 && ` · ${roleCount} held a post`}
                      </p>
                    </header>
                    {r.groups.map((g) => {
                      const dim = v && v !== g.id;
                      return (
                        <div key={g.id} className={c.group} data-dim={dim || none ? "" : undefined} inert={dim || none}>
                          <h3 className={c.groupHead}>
                            <span>{TEAM_LABEL[g.id]}</span>
                          </h3>
                          <ul className={c.names}>
                            {g.people.map((m) => {
                              const roles = rolesOf(m.designation);
                              const isPinned = pinned === m.slug;
                              return (
                                <li key={m.slug} className={c.row}>
                                  <button
                                    type="button"
                                    className={c.credit}
                                    data-credit=""
                                    data-slug={m.slug}
                                    data-off={litSet.has(m.slug) ? undefined : ""}
                                    aria-pressed={isPinned}
                                    tabIndex={m.slug === roveSlug ? 0 : -1}
                                    data-cursor="link"
                                    onPointerEnter={fine ? () => setHover(m.slug) : undefined}
                                    onPointerLeave={fine ? () => setHover((h) => (h === m.slug ? null : h)) : undefined}
                                    onFocus={() => {
                                      setRove(m.slug);
                                      setFocus(m.slug);
                                    }}
                                    onBlur={() => setFocus((f) => (f === m.slug ? null : f))}
                                    onClick={() => (isPinned ? unpin() : pin(m.slug))}
                                  >
                                    <span className={c.role}>
                                      {roles.map((x) => (
                                        <span key={x.role + x.tenure} className={c.roleLine}>
                                          {x.role}
                                          {x.tenure && <i> {x.tenure}</i>}
                                        </span>
                                      ))}
                                    </span>
                                    <span className={c.name}>{m.name}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </section>
                );
              })}

              <div className={c.end}>
                <p className={c.endMark}>DVM</p>
                <p className={c.endLine}>
                  Department of Visual Media · {STATS.first}–{STATS.last} · {STATS.people} names
                </p>
                <div className={c.endLinks}>
                  <Link to={P("/about")} className={ui.link}>
                    How the five teams work →
                  </Link>
                  <Link to={P("/alumni")} className={ui.link}>
                    Where the alumni went →
                  </Link>
                </div>
              </div>
            </div>

            {wide && (
              <aside className={c.aside} aria-label="Who this is">
                {dossier(false)}
              </aside>
            )}
          </div>
        </section>

        {fine && <Follower member={hoverMember} reduced={reduced} />}
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
