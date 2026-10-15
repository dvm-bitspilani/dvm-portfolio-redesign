// The Signal Board: one grid of twelve live tiles. The URL picks an arrangement (board/routes.js);
// changing it morphs every tile from its old box to its new one with the View Transitions API,
// or a WAAPI FLIP where that isn't available. Arrow keys move between tiles, Enter opens one,
// Esc collapses back to the board (from a project page: back to the project list).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import s from "./v7.module.css";
import { TILES, ROUTES, computeLayout, parsePath, routeHref } from "./routes";
import { P } from "../lib/paths";
import { useMobile, useReducedMotion } from "../lib/hooks";
import Backdrop from "./Backdrop";
import Masthead from "./Masthead";
import Signals from "./Signals";

import MarkTile from "../tiles/MarkTile";
import ClockTile from "../tiles/ClockTile";
import StatsTile from "../tiles/StatsTile";
import TeamTile from "../tiles/TeamTile";
import ArtTile from "../tiles/ArtTile";
import BlogTile from "../tiles/BlogTile";
import TickerTile from "../tiles/TickerTile";
import FestsTile from "../tiles/FestsTile";
import MapTile from "../tiles/MapTile";
import LegacyTile from "../tiles/LegacyTile";
import ArchiveTile from "../tiles/ArchiveTile";
import ContactTile from "../tiles/ContactTile";

const COMPONENTS = {
  mark: MarkTile,
  clock: ClockTile,
  stats: StatsTile,
  team: TeamTile,
  art: ArtTile,
  blog: BlogTile,
  ticker: TickerTile,
  fests: FestsTile,
  map: MapTile,
  legacy: LegacyTile,
  archive: ArchiveTile,
  contact: ContactTile,
};

const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const FLIP_MS = 560;
const EASE = "cubic-bezier(0.22, 0.9, 0.18, 1)";

export default function Board() {
  const location = useLocation();
  const navigate = useNavigate();
  const mobile = useMobile();
  const reduced = useReducedMotion();
  const gridRef = useRef(null);

  // The arrangement on screen lags the URL by one view transition.
  const [shownPath, setShownPath] = useState(location.pathname);
  const shownRef = useRef(shownPath);
  const view = useMemo(() => parsePath(shownPath), [shownPath]);
  const flipFrom = useRef(null);
  const fromKeyboard = useRef(false);
  const lastPrimary = useRef(null);

  const commit = useCallback((next) => {
    shownRef.current = next;
    setShownPath(next);
  }, []);

  // The power-on sequence plays once; after that, tiles never re-run it (e.g. after a transition).
  useEffect(() => {
    const id = window.setTimeout(() => gridRef.current && (gridRef.current.dataset.booted = ""), 1900);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const next = location.pathname;
    const prev = shownRef.current;
    if (next === prev) return;
    if (gridRef.current) gridRef.current.dataset.booted = "";
    const a = parsePath(prev);
    const b = parsePath(next);
    if (!b) return; // unknown path → <Navigate> below
    const rearranges = !a || a.key !== b.key;
    const scrollTop = () => mobile && window.scrollTo(0, 0);
    if (reduced) {
      commit(next);
      scrollTop();
      return;
    }
    if (document.startViewTransition && !document.hidden) {
      const grid = gridRef.current;
      if (grid) grid.dataset.vt = rearranges ? "layout" : "content";
      const vt = document.startViewTransition(() => {
        flushSync(() => commit(next));
        scrollTop();
      });
      vt.ready.catch(() => {});
      vt.finished
        .catch(() => {})
        .finally(() => {
          if (grid && shownRef.current === next) delete grid.dataset.vt;
        });
      return;
    }
    // FLIP fallback: remember where every tile was, swap, then animate from there (layout effect).
    if (rearranges && gridRef.current) {
      const rects = {};
      gridRef.current.querySelectorAll("[data-v7-tile]").forEach((el) => (rects[el.dataset.v7Tile] = el.getBoundingClientRect()));
      flipFrom.current = rects;
    }
    commit(next);
    scrollTop();
  }, [location.pathname, reduced, mobile, commit]);

  useLayoutEffect(() => {
    const from = flipFrom.current;
    flipFrom.current = null;
    if (!from || !gridRef.current) return;
    gridRef.current.querySelectorAll("[data-v7-tile]").forEach((el) => {
      const a = from[el.dataset.v7Tile];
      const b = el.getBoundingClientRect();
      if (!a || !b.width || !b.height) return;
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const sx = a.width / b.width;
      const sy = a.height / b.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
      el.animate(
        [
          { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: "0 0", transform: "none" },
        ],
        { duration: FLIP_MS, easing: EASE },
      );
    });
  }, [shownPath]);

  // Focus follows the arrangement: into the opened page, or back to the tile that was open.
  useEffect(() => {
    if (!view) return;
    const grid = gridRef.current;
    if (!grid) return;
    const active = document.activeElement;
    const inBoard = !active || active === document.body || grid.contains(active) || fromKeyboard.current;
    fromKeyboard.current = false;
    if (view.key === "home") {
      const id = lastPrimary.current;
      lastPrimary.current = null;
      if (id && inBoard) grid.querySelector(`[data-v7-tile="${id}"] [data-v7-hit]`)?.focus({ preventScroll: true });
      return;
    }
    lastPrimary.current = ROUTES[view.key].primary;
    if (!inBoard) return;
    const target = grid.querySelector(`[data-v7-tile="${ROUTES[view.key].primary}"] [data-v7-focus]`);
    target?.focus({ preventScroll: true });
  }, [view]);

  // Esc collapses (one level for a project page). The archive wall keeps Esc while a dossier is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented || !view || view.key === "home") return;
      const t = e.target;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) {
        t.blur();
        return;
      }
      if (view.key === "archive" && /[?&]item=/.test(location.search)) return;
      if (view.key === "artwork" && /[?&]a=/.test(location.search)) return;
      fromKeyboard.current = true;
      navigate(view.key === "projects" && view.sub ? P("/projects") : P("/"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, location.search, navigate]);

  // Spatial arrow-key navigation between tile handles.
  const onGridKey = useCallback((e) => {
    const d = DIRS[e.key];
    const t = e.target;
    if (!d || !t?.matches?.("[data-v7-handle]") || e.altKey || e.metaKey || e.ctrlKey) return;
    const grid = gridRef.current;
    const tileOf = (el) => el.closest("[data-v7-tile]");
    const from = tileOf(t)?.getBoundingClientRect();
    if (!from) return;
    const fx = from.left + from.width / 2;
    const fy = from.top + from.height / 2;
    let best = null;
    let bestScore = Infinity;
    grid.querySelectorAll("[data-v7-handle]").forEach((h) => {
      if (h === t || tileOf(h) === tileOf(t)) return;
      const r = tileOf(h).getBoundingClientRect();
      if (!r.width) return;
      // distance from the edge we leave through, so wide tiles next to narrow ones still connect
      const cx = Math.max(r.left, Math.min(fx, r.right));
      const cy = Math.max(r.top, Math.min(fy, r.bottom));
      const ex = d[0] ? (d[0] > 0 ? r.left - from.right : from.left - r.right) : 0;
      const ey = d[1] ? (d[1] > 0 ? r.top - from.bottom : from.top - r.bottom) : 0;
      const along = d[0] ? ex : ey;
      if (along < -4) return;
      const across = d[0] ? Math.abs(cy - fy) : Math.abs(cx - fx);
      const score = along + across * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = h;
      }
    });
    if (best) {
      e.preventDefault();
      best.focus();
      if (mobileQuery()) best.closest("[data-v7-tile]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  const onGridKeyCapture = useCallback((e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target?.matches?.("[data-v7-hit]")) fromKeyboard.current = true;
  }, []);

  const layout = useMemo(() => (view ? computeLayout(view, mobile) : null), [view, mobile]);

  if (!parsePath(location.pathname)) return <Navigate to={P("/")} replace />;
  if (!view || !layout) return null;

  return (
    <div className={s.root} data-view={view.key}>
      <Backdrop />
      <Masthead view={view} />
      <main
        ref={gridRef}
        className={s.grid}
        data-view={view.key}
        style={{ gridTemplateRows: layout.rows }}
        onKeyDown={onGridKey}
        onKeyDownCapture={onGridKeyCapture}
        aria-label={view.key === "home" ? "DVM signal board" : `${ROUTES[view.key].title}, with the rest of the board in the side rail`}
      >
        <Signals gridRef={gridRef} layoutKey={shownPath + (mobile ? ":m" : "")} />
        {TILES.map((tile, i) => (
          <TileFrame key={tile.id} tile={tile} index={i} role={layout.roles[tile.id]} style={layout.style[tile.id]} view={view} />
        ))}
      </main>
    </div>
  );
}

const mobileQuery = () => window.matchMedia("(max-width: 760px)").matches;

function TileFrame({ tile, index, role, style, view }) {
  const ref = useRef(null);
  const Comp = COMPONENTS[tile.id];
  const here = view.key === tile.route;
  const hasHit = role !== "primary" && !here;
  const ownCompanion = role === "companion" && here;
  return (
    <section
      ref={ref}
      className={s.tile}
      data-v7-tile={tile.id}
      data-role={role}
      aria-labelledby={`v7-h-${tile.id}`}
      tabIndex={ownCompanion ? 0 : undefined}
      data-v7-handle={ownCompanion ? "" : undefined}
      style={{ ...style, viewTransitionName: `v7-${tile.id}`, viewTransitionClass: "v7tile", "--i": index }}
    >
      <Comp role={role} view={view} tileRef={ref} label={tile.label} />
      {hasHit && (
        <Link
          to={routeHref(tile.route)}
          className={s.hit}
          data-v7-hit=""
          data-v7-handle=""
          aria-label={`${tile.label}: open ${ROUTES[tile.route].title}`}
        />
      )}
      {role === "primary" && (
        <Link to={P("/")} className={s.close} data-v7-handle="" aria-label="Collapse to the board (Esc)">
          <span className={s.closeIcon} aria-hidden="true" />
          <span className={s.closeText}>Board</span>
          <kbd className={s.kbd}>Esc</kbd>
        </Link>
      )}
    </section>
  );
}
