// /alumni · Companies as a sector map (research/v8-legacy-companies-viz.md; round 3:
// research/v8-alumni-page-r3.md §3.5). No search, no filter: all the companies are always on the
// floor, grouped into nine sectors (legacy/page/sectors), each a framed panel captioned with its name
// and how many companies it holds. Inside, a strict grid of the page's one company disc
// (CompanyDisc, 48 px): logo, name, "n alumni" from two up. Hover / focus a disc and its people
// branch out of it (Branch); click pins them; on touch screens and phones a tap opens them in a
// bottom sheet (CompanySheet, below). A person's company in People asks for its disc here
// (kin.js requestStar → openCompany.js). Geometry: legacy/page/mapLayout.
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMedia, useReducedMotion } from "../../lib/hooks";
import LegacyCircle from "../LegacyCircle";
import ui from "../../ui.module.css";
import CompanyDisc from "./CompanyDisc";
import { requestPerson } from "./kin";
import { DISC, lattice, latticeCols, panelPad, placePanels, rowH } from "./mapLayout";
import { BRANCH_ID, companyOf, ctl, getOpen, pinnedFromKeyboard, useOpen } from "./openCompany";
import { PersonRow } from "./PersonCard";
import { SECTOR_GROUPS, SECTOR_OF } from "./sectors";
import s from "./legacyPage.module.css";

/** A name with a word too long for a cell at the label's size ("Medsupervision", "Semiconductor"). */
const longWord = (name) => name.split(/\s+/).some((w) => w.length >= 11);
/** Between panels in a column, and between columns (= --col-gap). */
const GAP = 24;

/** The lattice box's width before it is measured: the breakpoint's nominal panel, less its padding. */
function nominalW(panelCols) {
  if (typeof window === "undefined") return 387;
  const vw = window.innerWidth;
  const gutter = vw < 760 ? 20 : Math.min(64, Math.max(20, vw * 0.045));
  const wrap = Math.min(1520, vw - 2 * gutter);
  return (wrap - (panelCols - 1) * GAP) / panelCols - 2 * panelPad(vw) - 2;
}

/** One sector: its name and company count, then its companies on the grid. */
function SectorPanel({ g, i, col, top, height, W, active }) {
  const L = useMemo(
    () =>
      lattice(
        g.companies.map((c) => c.id),
        W,
      ),
    [g, W],
  );
  const hid = `v8-alumni-sector-${g.id}`;
  return (
    <section className={s.panel} style={{ "--i": i, "--col": col, top, height }} aria-labelledby={hid} data-active={active || undefined}>
      <div className={s.panelBox}>
        <div className={s.panelHead}>
          <h3 id={hid} className={`${ui.meta} ${s.mapSector}`}>
            {g.label}
            <span className={ui.srOnly}>, {g.count} companies</span>
          </h3>
          <p className={`${ui.meta} ${s.panelNums}`} aria-hidden="true">
            {g.count}
          </p>
        </div>
        <ul className={s.field} style={{ height: L.height }} data-field="">
          {g.companies.map((c, k) => {
            const cell = L.cells[k];
            return (
              <li key={c.id} className={s.star} style={{ left: cell.c * L.cellW, top: cell.r * L.rowH, width: L.cellW, height: L.rowH, "--k": Math.min(k, 24) }}>
                <CompanyDisc k={`map:${c.id}`} ids={[c.id]} name={c.name} logo={c.logo} n={c.ever.length} size={DISC} variant="map" long={longWord(c.name)} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default function Companies() {
  const mapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const three = useMedia("(min-width: 1100px)");
  const two = useMedia("(min-width: 760px)");
  const reduced = useReducedMotion();
  const panelCols = three ? 3 : two ? 2 : 1;
  const open = useOpen();
  const openSector = open?.key.startsWith("map:") ? SECTOR_OF.get(open.key.slice(4)) : undefined;

  // the lattice box's width: every panel is one column wide, so one measure serves them all
  const [W, setW] = useState(() => nominalW(panelCols));
  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const measure = () => {
      const f = map.querySelector("[data-field]");
      if (f && f.clientWidth) setW((w) => (Math.abs(w - f.clientWidth) > 0.5 ? f.clientWidth : w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(map);
    return () => ro.disconnect();
  }, [panelCols]);

  // panels in SECTORS order (= reading order), each placed in its balanced column
  const placed = useMemo(() => placePanels(SECTOR_GROUPS, panelCols, () => latticeCols(W), GAP, rowH(W)), [panelCols, W]);

  // the entrance: each panel once, as it comes into view (a phone's column is ~4000 px tall, so a
  // threshold on the whole map would never trip). The attribute is set on the node, outside React.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const panels = [...map.querySelectorAll("section")];
    if (reduced || typeof IntersectionObserver === "undefined") {
      for (const p of panels) p.dataset.in = "";
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
      { threshold: 0.12 },
    );
    for (const p of panels) if (!("in" in p.dataset)) io.observe(p);
    return () => io.disconnect();
  }, [reduced, panelCols]);

  return (
    <div ref={mapRef} className={s.map} style={{ "--cols": panelCols, height: placed.height }} data-cursor="dot">
      {placed.panels.map(({ group, i, col, top, height }) => (
        <SectorPanel key={group.id} g={group} i={i} col={col} top={top} height={height} W={W} active={openSector === group.id} />
      ))}
    </div>
  );
}

/**
 * The open company's people on touch screens and phones: a bottom sheet (a portal into the V8 root,
 * over a scrim). Head: the disc, the name, "n alumni", Close. Each row shows that person in People.
 */
export function CompanySheet() {
  const open = useOpen();
  if (!open) return null;
  return <Sheet key={open.key} k={open.key} />;
}

function Sheet({ k }) {
  const co = companyOf(k);
  const closeRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  // a sheet opened from the keyboard takes the focus (it is at the end of the page, not after the disc)
  useEffect(() => {
    if (getOpen()?.pinned && pinnedFromKeyboard()) closeRef.current?.focus({ preventScroll: true });
  }, []);
  if (!co) return null;
  const n = co.rows.length;
  return createPortal(
    <div className={s.sheetRoot} data-sheet="">
      <div className={s.scrim} aria-hidden="true" onClick={() => ctl.close(true)} />
      <div id={BRANCH_ID} className={s.sheet} role="region" aria-label={`Alumni at ${co.name}`}>
        <div className={s.sheetHead}>
          <LegacyCircle logo={co.logo} name={co.name} size={40} rest="tinted" lit />
          <div className={s.sheetTitle}>
            <p className={`${ui.strong} ${s.sheetName}`}>{co.name}</p>
            {n >= 2 && <p className={`${ui.meta} ${s.sheetCount}`}>{n} alumni</p>}
          </div>
          <button ref={closeRef} type="button" className={`${ui.meta} ${s.sheetClose}`} onClick={() => ctl.close(true)}>
            <span aria-hidden="true">×</span> Close
          </button>
        </div>
        <ul className={s.sheetList}>
          {co.rows.map((row, i) => (
            <PersonRow
              key={row.person.slug}
              row={row}
              i={i}
              onFind={(slug) => {
                // the sheet covers the list: close it, then go
                ctl.close(false);
                requestPerson(slug);
              }}
            />
          ))}
        </ul>
      </div>
    </div>,
    // the variant's root carries the tokens (and sits above nothing that clips): not <body>
    document.querySelector("[data-v8-root]") ?? document.body,
  );
}
