// V6 · Constellation — the whole site is one living network graph of DVM.
// The shell keeps ONE graph (model + simulation) for the lifetime of the variant; every route
// is a focus state of it (lib/focus.js) plus a panel. /archive folds the nodes into a grid
// and hands over to the ArchiveWall ("every node as a tile").
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import s from "./v6.module.css";
import bg3 from "../../assests/bg_3.png";

import { buildGraph, routeFor } from "./graph/model";
import { Sim } from "./graph/sim";
import GraphView from "./graph/GraphView";
import { P } from "./lib/paths";
import { resolveFocus } from "./lib/focus";
import { ShellContext, useCompact, useReducedMotion } from "./lib/hooks";

import Header from "./chrome/Header";
import Crumbs from "./chrome/Crumbs";
import Search from "./chrome/Search";
import ZoomControls from "./chrome/ZoomControls";
import HomePanel from "./panels/HomePanel";
import AboutPanel from "./panels/AboutPanel";
import ProjectsPanel from "./panels/ProjectsPanel";
import LegacyPanel from "./panels/LegacyPanel";
import TeamPanel from "./panels/TeamPanel";
import BlogPanel from "./panels/BlogPanel";
import ArtworkPanel from "./panels/ArtworkPanel";
import ContactPanel from "./panels/ContactPanel";
import ArchivePage from "./pages/ArchivePage";

const PANEL_W = 432;

function useViewportWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

export default function V6() {
  const location = useLocation();
  const navigate = useNavigate();
  const graph = useMemo(() => buildGraph(), []);
  const sim = useMemo(() => new Sim(graph), [graph]);
  const compact = useCompact();
  const reduced = useReducedMotion();
  const vw = useViewportWidth();
  const graphApi = useRef(null);

  const state = useMemo(() => resolveFocus(location.pathname, location.search, graph), [location.pathname, location.search, graph]);
  const { route } = state;
  const isArchive = route === "archive";

  // ---- archive handoff: fold the nodes into a grid, then swap in the wall
  const firstRoute = useRef(route);
  const [archivePhase, setArchivePhase] = useState(isArchive ? "wall" : "off");
  useEffect(() => {
    if (!isArchive) {
      setArchivePhase("off");
      return;
    }
    if (archivePhase === "wall") return;
    if (reduced || firstRoute.current === "archive") {
      setArchivePhase("wall");
      return;
    }
    setArchivePhase("grid");
    const t = setTimeout(() => setArchivePhase("wall"), 1150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArchive, reduced]);
  const graphMounted = archivePhase !== "wall";

  // The engine focus object only changes when the resolved focus does (stable identity).
  const focusKey = JSON.stringify(state.focus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const focus = useMemo(() => state.focus, [focusKey]);

  // ---- breadcrumb: a trail of focus states (re-visiting one cuts the trail back to it)
  const [trail, setTrail] = useState([]);
  useEffect(() => {
    const n = new URLSearchParams(location.search).get("n");
    const key = location.pathname.replace(/\/$/, "") + (n ? `?n=${encodeURIComponent(n)}` : "");
    setTrail((t) => {
      const at = t.findIndex((c) => c.key === key);
      if (at >= 0) return t.slice(0, at + 1);
      if (route === "home" && !n) return [{ key, label: "DVM", to: key }];
      const base = t.length ? t : [{ key: P("/"), label: "DVM", to: P("/") }];
      const next = [...base, { key, label: state.label, to: key }];
      return next.length > 5 ? [next[0], ...next.slice(-4)] : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // ---- clicks on nodes
  const onSelect = useCallback(
    (node) => {
      if (node.kind === "core") {
        graphApi.current?.drop();
        navigate(P("/"));
        return;
      }
      if (route === "legacy" && node.kind !== "hub") {
        navigate(P(`/legacy?n=${encodeURIComponent(node.id)}`));
        return;
      }
      navigate(P(routeFor(node)));
    },
    [navigate, route],
  );

  // ---- search + keys
  const [searchOpen, setSearchOpen] = useState(false);
  const searchReturn = useRef(null);
  const openSearch = useCallback(() => {
    searchReturn.current = document.activeElement;
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    requestAnimationFrame(() => searchReturn.current?.focus?.());
  }, []);
  const closeTarget = useMemo(() => {
    const n = new URLSearchParams(location.search).get("n");
    if (n) return location.pathname;
    if (route === "projects" && state.selectedNode) return P("/projects");
    if (route !== "home" && route !== "archive") return P("/");
    return null;
  }, [location.pathname, location.search, route, state.selectedNode]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (searchOpen) closeSearch();
        else openSearch();
        return;
      }
      if (typing || searchOpen) return;
      if (e.key === "/" && !isArchive) {
        e.preventDefault();
        openSearch();
      } else if (e.key === "Escape" && closeTarget && !isArchive) {
        navigate(closeTarget);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, openSearch, closeSearch, closeTarget, navigate, isArchive]);

  // ---- layout insets for the camera (desktop: panel on the right, intro on the left)
  const hasPanel = !compact && route !== "home" && route !== "archive";
  const insets = useMemo(() => {
    if (compact) return { top: 8, right: 8, bottom: 8, left: 8 };
    return {
      top: 112,
      bottom: 36,
      right: hasPanel ? PANEL_W + 36 : 28,
      left: route === "home" ? Math.min(600, vw * 0.4) : 28,
    };
  }, [compact, hasPanel, route, vw]);

  const shell = useMemo(
    () => ({ graph, state, compact, reduced, preview: (id) => graphApi.current?.preview(id), closeTarget, openSearch }),
    [graph, state, compact, reduced, closeTarget, openSearch],
  );

  const [exploring, setExploring] = useState(false);

  const intro = useRef(true);
  useEffect(() => {
    intro.current = false;
  }, []);

  return (
    <ShellContext.Provider value={shell}>
      <div className={`${s.root} ${compact ? s.compact : s.wide} ${isArchive ? s.onArchive : ""}`} data-exploring={exploring || undefined}>
        <div className={s.backdrop} aria-hidden="true">
          <div className={s.texture} style={{ backgroundImage: `url(${bg3})` }} />
          <div className={s.grid} />
          <svg className={s.letters} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax meet">
            <text x="600" y="360" textAnchor="middle">DVM</text>
          </svg>
        </div>

        <Header onSearch={openSearch} />

        {!isArchive && <Crumbs trail={trail} />}

        {graphMounted && (
          <div className={s.stage} data-route={route}>
            <GraphView
              ref={graphApi}
              sim={sim}
              focus={focus}
              insets={insets}
              intro={intro.current}
              compact={compact}
              reduced={reduced}
              onSelect={onSelect}
              onExplore={setExploring}
            />
            {!isArchive && <ZoomControls api={graphApi} panel={hasPanel} />}
          </div>
        )}

        <main className={s.main} key={isArchive ? "archive" : "graph"}>
          <Routes>
            <Route index element={<HomePanel />} />
            <Route path="about" element={<AboutPanel />} />
            <Route path="projects" element={<ProjectsPanel />} />
            <Route path="projects/:name" element={<ProjectsPanel />} />
            <Route path="legacy" element={<LegacyPanel />} />
            <Route path="team" element={<TeamPanel />} />
            <Route path="blog" element={<BlogPanel />} />
            <Route path="artwork" element={<ArtworkPanel />} />
            <Route path="contactus" element={<ContactPanel />} />
            <Route path="archive" element={<ArchivePage ready={archivePhase === "wall"} />} />
            <Route path="*" element={<Navigate to={P("/")} replace />} />
          </Routes>
        </main>

        {searchOpen && <Search onClose={closeSearch} />}
      </div>
    </ShellContext.Provider>
  );
}
