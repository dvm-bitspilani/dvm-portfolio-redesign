// /alumni: the open company's people, branching out of its disc (research/v8-alumni-page-r3.md §3.7)
// — the home's Alumni section does the same (legacy/Legacy.jsx), and both draw it with one recipe:
// the pill and connector look is legacy/branch.module.css, the placement legacy/fan.js (a column
// beside the disc, right when it fits, else left; each pill on its own elbow connector out of the
// rim). One fixed layer for the page, mounted once by AlumniPage on pointer devices ≥ 760 px
// (otherwise CompanySheet). It follows its disc as the page scrolls; when the disc leaves the
// viewport the layer steps aside but the company stays open, so its people stay lit in People.
// A pill shows that person in People (and keeps the company pinned, so they stay lit there).
// More than eight people: the first seven, and "+n more".
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { layoutFan } from "../fan";
import br from "../branch.module.css";
import { useReducedMotion } from "../../lib/hooks";
import { personName, roleText } from "./format";
import { requestPerson } from "./kin";
import { BRANCH_ID, companyOf, ctl, nextTabbable, useOpen } from "./openCompany";
import { Tag } from "./PersonCard";
import s from "./legacyPage.module.css";

/** Never under the nav, never on the viewport's edge. */
const NAV_CLEAR = 84;
const EDGE = 16;
const MAX_PILLS = 8;
const OUT_MS = 120;

function Avatar({ p }) {
  const [failed, setFailed] = useState(!p.photo);
  return (
    <span className={br.avatar} aria-hidden="true">
      {failed ? p.name[0] : <img src={p.photo} alt="" width="28" height="28" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
}

/** @param {{ row: import("../alumniData").CompanyPerson, i: number, at?: { x: number, y: number }, side?: string, k: string }} props */
function Pill({ row, i, at, side, k }) {
  const p = row.person;
  const intern = row.kind === "intern";
  const role = [roleText(row.role, row.kind), row.unit].filter(Boolean).join(" · ");
  const name = personName(p.name);
  return (
    <li className={br.pill} data-side={side} style={at ? { left: at.x, top: at.y, "--i": i } : { visibility: "hidden" }}>
      <button
        type="button"
        className={`${br.pillIn} ${s.pillBtn}`}
        data-pill=""
        aria-label={`${name}, ${p.batch} ${p.team}${intern ? ", intern" : ""}. Show in People`}
        onClick={() => {
          ctl.pin(k);
          requestPerson(p.slug);
        }}
      >
        <Avatar p={p} />
        <span className={br.pillText}>
          <span className={br.pillTop}>
            <span className={br.pillName}>{name}</span>
            <span className={br.pillBatch}>{p.batch}</span>
          </span>
          {(role || intern) && (
            <span className={br.pillRole}>
              {role && <span className={br.pillRoleText}>{role}</span>}
              {intern && <Tag />}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/** @param {{ k: string, out: boolean }} props */
function Layer({ k, out }) {
  const co = companyOf(k);
  const listRef = useRef(/** @type {HTMLUListElement | null} */ (null));
  const [fan, setFan] = useState(/** @type {ReturnType<typeof layoutFan>} */ (null));
  const [away, setAway] = useState(false);
  const rows = co?.rows ?? [];
  const more = rows.length > MAX_PILLS ? rows.length - (MAX_PILLS - 1) : 0;
  const list = more ? rows.slice(0, MAX_PILLS - 1) : rows;

  // measure the pills as rendered, then place them beside the disc (before paint); again on every
  // scroll / resize frame, and when a late photo or font changes a pill's size
  useLayoutEffect(() => {
    const ul = listRef.current;
    const anchor = document.querySelector(`[data-branch-anchor="${CSS.escape(k)}"]`);
    if (!ul || !anchor) return undefined;
    let raf = 0;
    const place = () => {
      raf = 0;
      const a = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const gone = a.bottom < NAV_CLEAR || a.top > vh || a.width === 0;
      setAway(gone);
      if (gone) return;
      const sizes = [...ul.children].map((el) => ({ w: /** @type {HTMLElement} */ (el).offsetWidth, h: /** @type {HTMLElement} */ (el).offsetHeight }));
      const f = layoutFan({
        node: { x: a.left + a.width / 2, y: a.top + a.height / 2, r: a.width / 2 },
        sizes,
        bounds: { l: EDGE, t: NAV_CLEAR, r: vw - EDGE, b: vh - EDGE },
        prefer: ["right", "left", "below", "above"],
      });
      setFan(f);
    };
    place();
    const on = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = new ResizeObserver(on);
    for (const el of ul.children) ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      ro.disconnect();
    };
  }, [k]);

  if (!co) return null;

  /** Tab off the last pill goes on past the disc; Shift+Tab off the first goes back to it. */
  const keyDown = (/** @type {import("react").KeyboardEvent} */ e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      ctl.close(true);
      return;
    }
    if (e.key !== "Tab") return;
    const pills = /** @type {HTMLElement[]} */ ([...(listRef.current?.querySelectorAll("[data-pill]") ?? [])]);
    const i = pills.indexOf(/** @type {HTMLElement} */ (e.target));
    if (i < 0) return;
    if (e.shiftKey && i === 0) {
      e.preventDefault();
      ctl.toDisc();
    } else if (!e.shiftKey && i === pills.length - 1) {
      const disc = document.querySelector(`[data-co-key="${CSS.escape(k)}"]`);
      const next = disc && nextTabbable(disc);
      if (next) {
        e.preventDefault();
        next.focus();
      }
    }
  };

  return (
    <div
      id={BRANCH_ID}
      className={s.branch}
      data-branch=""
      data-cursor="dot"
      data-away={away || undefined}
      data-out={out || undefined}
      inert={out || undefined}
      role="region"
      aria-label={`Alumni at ${co.name}`}
      onKeyDown={keyDown}
    >
      {fan && (
        <svg className={br.fanLines} aria-hidden="true">
          <polygon className={br.bridge} points={fan.bridge.map((q) => q.join(",")).join(" ")} onPointerEnter={ctl.stay} onPointerLeave={(e) => ctl.leave(k, e)} />
          {fan.paths.map((q, i) => (
            <path key={i} d={q.d} pathLength="1" className={br.fanLine} style={{ "--i": i }} />
          ))}
        </svg>
      )}
      <ul ref={listRef} className={s.branchList} onPointerEnter={ctl.stay} onPointerLeave={(e) => ctl.leave(k, e)}>
        {list.map((row, i) => (
          <Pill key={row.person.slug} row={row} i={i} at={fan?.pills[i]} side={fan?.side} k={k} />
        ))}
        {more > 0 && (
          <li className={br.pill} data-side={fan?.side} style={fan ? { left: fan.pills[list.length].x, top: fan.pills[list.length].y, "--i": list.length } : { visibility: "hidden" }}>
            <span className={`${br.pillIn} ${s.pillMore}`}>+{more} more</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default function Branch() {
  const open = useOpen();
  const reduced = useReducedMotion();
  // the last company, kept for the layer's fade-out (a switch to another disc draws at once)
  const [last, setLast] = useState(open);
  useEffect(() => {
    if (open) {
      setLast(open);
      return undefined;
    }
    const t = window.setTimeout(() => setLast(null), reduced ? 80 : OUT_MS);
    return () => window.clearTimeout(t);
  }, [open, reduced]);
  const cur = open ?? last;
  if (!cur) return null;
  return <Layer key={cur.key} k={cur.key} out={!open} />;
}
