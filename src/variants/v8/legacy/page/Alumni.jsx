// /alumni · People, as a loom (research/v8-legacy-alumni-viz.md; round 3:
// research/v8-alumni-page-r3.md §3.11). No search, no filter: everyone is always on the floor,
// placed by the two facts everyone knows about an alum — the batch (a year over a rule) and the team
// (a lane, captioned once and sticky). Where they meet sits that cohort's team: everyone with a
// published role as a row — photo, name (the LinkedIn link), their company now (a button that finds
// it on the map, with the Intern tag when that is what it is), the role, and "Earlier: …" — and
// under them, quieter, the names of the rest.
// Linking (legacy/page/kin): hovering a row lights its company's discs above; a company open above
// lights every row of someone who ever worked there (data-cos), with a teal bar on the left. The
// map's branch can ask for a person here (requestPerson): scrolled to and pulsed.
// ≥ 1280: the loom (five lanes); below: per batch, team blocks (two columns, then one).
// Data: legacy/page/roster.
import { useEffect, useId, useRef, useState } from "react";
import SocialIcon from "../../chrome/SocialIcon";
import { TEAMS, previousCompanies } from "../alumniData";
import { useMedia, useReducedMotion } from "../../lib/hooks";
import LegacyCircle from "../LegacyCircle";
import ui from "../../ui.module.css";
import { personName } from "./format";
import { getKin, onKin, onPersonRequest, requestStar, setKinHover } from "./kin";
import { Photo, Tag } from "./PersonCard";
import { RAILS } from "./roster";
import s from "./legacyPage.module.css";

/** Earlier companies named in a row, then "+n". */
const EARLIER = 3;
/** Rows past this one in a cell share its entrance delay. */
const K_MAX = 8;

/** Every company in a person's history (the kin selector's list), or undefined. */
const cosOf = (p) => (p.history.length ? [...new Set(p.history.map((h) => h.companyId))].join(" ") : undefined);

/** The five team captions over the loom's lanes: sticky under the nav while the loom scrolls. */
function ThreadHeads() {
  return (
    <div className={s.threadRow} aria-hidden="true">
      <div className={s.threadRowIn}>
        {TEAMS.map((t) => (
          <p key={t.id} className={`${ui.meta} ${s.threadHead}`}>
            {t.label}
          </p>
        ))}
      </div>
    </div>
  );
}

/** One alum with a published role: who, and where they are now. */
function Bead({ p, k }) {
  const [hot, setHot] = useState(false);
  const l = p.latest;
  if (!l) return null;
  const name = personName(p.name);
  const prev = previousCompanies(p);
  const earlier = prev.slice(0, EARLIER).map((c) => c.name).join(", ") + (prev.length > EARLIER ? ` +${prev.length - EARLIER}` : "");
  const on = () => {
    setHot(true);
    setKinHover(l.companyId);
  };
  const off = () => {
    setHot(false);
    setKinHover(null);
  };
  return (
    <li
      className={s.bead}
      data-co={l.companyId}
      data-cos={cosOf(p)}
      data-slug={p.slug}
      style={{ "--k": Math.min(k, K_MAX) }}
      onPointerEnter={(e) => e.pointerType !== "touch" && on()}
      onPointerLeave={(e) => e.pointerType !== "touch" && off()}
      onFocus={on}
      onBlur={(e) => {
        if (e.currentTarget.contains(/** @type {Node | null} */ (e.relatedTarget))) return;
        off();
      }}
    >
      <Photo person={p} width={32} className={s.beadPhoto} />
      <div className={s.beadBody}>
        <p className={s.beadName}>
          {p.linkedin ? (
            <a href={p.linkedin} target="_blank" rel="noreferrer" aria-label={`${name}, LinkedIn`} data-cursor="lock">
              {name}
              <SocialIcon name="linkedin" size={13} />
            </a>
          ) : (
            <span>{name}</span>
          )}
        </p>
        <p className={s.beadNow}>
          <button
            type="button"
            className={s.chip}
            aria-label={`${l.company.name}${l.kind === "intern" ? ", intern" : ""}, show in Companies`}
            onClick={() => requestStar(l.companyId)}
          >
            <LegacyCircle logo={l.company.logo} name={l.company.name} size={20} rest="tinted" lit={hot} className={s.chipDisc} />
            {/* the tag runs on after the name, so a name that wraps keeps it beside its last word */}
            <span className={s.chipName}>
              <span className={s.chipText}>{l.company.name}</span>
              {l.kind === "intern" && <Tag />}
            </span>
          </button>
        </p>
        {l.role && <p className={s.beadRole}>{l.role}</p>}
        {prev.length > 0 && <p className={s.beadEarlier}>Earlier: {earlier}</p>}
      </div>
    </li>
  );
}

/** Where a batch meets a team: the rows, then the names of the rest. */
function Cell({ cell, batch, t, head }) {
  const { team, beads, quiet } = cell;
  return (
    <div className={s.cell} style={{ "--t": t }}>
      {head && <p className={`${ui.meta} ${s.cellHead}`}>{team.label}</p>}
      {beads.length > 0 && (
        <ul className={s.beads} aria-label={`${team.label} ${batch}`}>
          {beads.map((p, k) => (
            <Bead key={p.slug} p={p} k={k} />
          ))}
        </ul>
      )}
      {quiet.length > 0 && (
        <ul className={s.quiet} aria-label={`${team.label} ${batch}, more`}>
          {quiet.map((p) => {
            const name = personName(p.name);
            return (
              <li key={p.slug} className={s.quietName} data-slug={p.slug} data-cos={cosOf(p)}>
                {p.linkedin ? (
                  <a href={p.linkedin} target="_blank" rel="noreferrer" aria-label={`${name}, LinkedIn`} data-cursor="lock">
                    {name}
                  </a>
                ) : (
                  <span>{name}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Alumni() {
  const uid = useId();
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const loom = useMedia("(min-width: 1280px)");
  const reduced = useReducedMotion();

  // the entrance, rail by rail as each comes into view (the attribute is set on the node, outside
  // React, as the map does with its panels)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const groups = /** @type {HTMLElement[]} */ ([...root.querySelectorAll("[data-rail]")]);
    if (reduced || typeof IntersectionObserver === "undefined") {
      for (const g of groups) g.dataset.in = "";
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          /** @type {HTMLElement} */ (e.target).dataset.in = "";
          io.unobserve(e.target);
        }
      },
      { threshold: 0.1 },
    );
    for (const g of groups) if (!("in" in g.dataset)) io.observe(g);
    return () => io.disconnect();
  }, [reduced, loom]);

  // kin (legacy/page/kin): the company in the light lights its beads — CSS only, no re-render
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = (/** @type {readonly string[] | null} */ ids) => {
      for (const el of root.querySelectorAll("[data-kin]")) el.removeAttribute("data-kin");
      for (const id of ids ?? []) for (const el of root.querySelectorAll(`[data-cos~="${CSS.escape(id)}"]`)) el.setAttribute("data-kin", "");
    };
    apply(getKin());
    return onKin(apply);
  }, [loom]);

  // "show this person" (from a company's card on the map): scroll them to the middle, reveal their
  // rail at once, pulse them, and hand their link the focus
  useEffect(() => {
    let t = 0;
    const off = onPersonRequest((slug) => {
      const root = rootRef.current;
      const el = /** @type {HTMLElement | null} */ (root?.querySelector(`[data-slug="${CSS.escape(slug)}"]`));
      if (!el) return;
      const rail = /** @type {HTMLElement | null} */ (el.closest("[data-rail]"));
      if (rail) rail.dataset.in = "";
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      el.removeAttribute("data-found");
      void el.offsetWidth;
      el.setAttribute("data-found", "");
      /** @type {HTMLElement | null} */ (el.querySelector("a, button"))?.focus({ preventScroll: true });
      window.clearTimeout(t);
      t = window.setTimeout(() => el.removeAttribute("data-found"), 2600);
    });
    return () => {
      off();
      window.clearTimeout(t);
    };
  }, [reduced]);

  return (
    <div ref={rootRef} className={s.alumni} data-layout={loom ? "loom" : "blocks"}>
      {loom && <ThreadHeads />}
      <div>
        {RAILS.map((r) => {
          const hid = `${uid}-b${r.batch}`;
          const cells = r.cells.map((cell, t) => ({ cell, t })).filter((x) => loom || x.cell.beads.length + x.cell.quiet.length > 0);
          return (
            <section key={r.batch} className={s.railGroup} aria-labelledby={hid} data-rail={r.batch}>
              <h3 id={hid} className={s.railYear}>
                {r.batch}
              </h3>
              <div className={loom ? s.lanes : s.blocks}>
                {cells.map(({ cell, t }) => (
                  <Cell key={cell.team.id} cell={cell} batch={r.batch} t={loom ? t : cells.findIndex((x) => x.t === t)} head={!loom} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
