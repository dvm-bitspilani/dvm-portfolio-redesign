// V8 · Hologram — full site under /v/v8/*.
// The shell holds what outlives a route change: the room (one grid, one pool of light,
// chrome/Room.jsx + chrome/Light.jsx), the live hologram brand mark (one WebGL context, posed
// by the home hero or the menu, hidden elsewhere: the bar shows a static print), the menu, the
// boot overlay (chrome/Boot.jsx; on every full page load, never on in-app navigation) and the
// swipe-panel route transition. The type system is Hubot Sans (lib/fonts.js injects it before
// the first paint; the tokens are in v8.module.css). Fine, hovering pointers get V8's own
// cursor (chrome/Cursor.jsx; `data-cursor="custom"` on the root hides the native one).
// Reduced motion: routes swap at once (no swipe panel). While the boot overlay blocks the page
// and while the menu is open, the pages are inert. After an in-app navigation, focus moves to the
// new page's heading (keyboard and screen-reader visitors keep their place).
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "@fontsource-variable/jetbrains-mono";
import appStyles from "../../App.module.css";
import s from "./v8.module.css";

import Boot from "./chrome/Boot";
import Cursor from "./chrome/Cursor";
import Menu from "./chrome/Menu";
import Room from "./chrome/Room";
import { LightProvider } from "./chrome/Light";
import { MarkProvider } from "./chrome/mark";
import { ChromeContext } from "./chrome/shell";
import { P } from "./lib/paths";
import { useFonts } from "./lib/fonts";
import { useMedia, useReducedMotion } from "./lib/hooks";
import { scheduleRefresh } from "./lib/refresh";
import { loadArchivePage, warmArchive } from "./lib/prefetch";

import Home from "./home/Home";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import TeamPage from "./pages/TeamPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectPage from "./pages/ProjectPage";
import ArtworkPage from "./pages/ArtworkPage";
import ContactPage from "./pages/ContactPage";
import AlumniPage from "./pages/AlumniPage";

const isHome = (pathname) => pathname.replace(/\/$/, "") === P("/");
// its own chunk: warmed in idle time after the boot (lib/prefetch.js)
const ArchivePage = lazy(loadArchivePage);

/** The page was /legacy until it became /alumni: old links land on it, query and hash kept. */
function LegacyToAlumni() {
  const { search, hash } = useLocation();
  return <Navigate to={`${P("/alumni")}${search}${hash}`} replace />;
}

export default function V8() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle"); // idle | cover | reveal
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  // the boot overlay covers the page (until its fade starts): keyboard input must not reach it
  const [blocking, setBlocking] = useState(true);
  const [menu, setMenu] = useState(null); // null | "open" | "closing"
  const menuFocus = useRef(null);
  useFonts();
  const customCursor = useMedia("(pointer: fine) and (hover: hover)");
  const reduced = useReducedMotion();
  const pagesRef = useRef(null);
  // once the first boot is over: warm the archive (route chunk + tile images) in idle time
  useEffect(() => {
    if (!revealed) return;
    let stop = () => {};
    const t = window.setTimeout(() => {
      // (on /archive itself the wall is already streaming its own images)
      if (!/\/archive\/?$/.test(window.location.pathname)) stop = warmArchive();
    }, 1500);
    return () => {
      window.clearTimeout(t);
      stop();
    };
  }, [revealed]);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // reduced motion: no swipe, the new page is simply there
      if (reduced) {
        setDisplayLocation(location);
        setStage("idle");
      } else setStage("cover");
    } else if (location.search !== displayLocation.search || location.state !== displayLocation.state) setDisplayLocation(location);
  }, [location, displayLocation, reduced]);

  // Navigating (from the menu or anywhere) closes the menu.
  useEffect(() => {
    setMenu((m) => (m === "open" ? "closing" : m));
  }, [location.pathname]);

  // New page under the panel: start at the top and re-measure every trigger.
  useLayoutEffect(() => {
    if (!displayLocation.state?.scrollTo) window.scrollTo(0, 0);
    return scheduleRefresh();
  }, [displayLocation.pathname, displayLocation.state]);

  // ...and hand it the focus (not on the first load: the page starts at the document)
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    const pages = pagesRef.current;
    if (!pages) return;
    const target = pages.querySelector("h1") ?? pages;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, [displayLocation.pathname]);

  const onPanelEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (stage === "cover") {
      setDisplayLocation(location);
      setStage("reveal");
    } else if (stage === "reveal") setStage("idle");
  };

  const onExit = useCallback(() => {
    setRevealed(true);
    setBlocking(false);
  }, []);
  const onFinish = useCallback(() => {
    setRevealed(true);
    setBlocking(false);
    setLoading(false);
  }, []);

  const openMenu = useCallback((from) => {
    menuFocus.current = from || document.activeElement;
    setMenu("open");
  }, []);
  const closeMenu = useCallback(() => setMenu((m) => (m ? "closing" : m)), []);
  const onMenuClosed = useCallback(() => setMenu(null), []);

  const chrome = useMemo(
    () => ({ revealed, menuOpen: menu === "open", openMenu, closeMenu }),
    [revealed, menu, openMenu, closeMenu],
  );

  return (
    <ChromeContext.Provider value={chrome}>
      <LightProvider routeKey={displayLocation.pathname}>
        <MarkProvider homeActive={isHome(location.pathname)}>
          <div className={s.root} data-cursor={customCursor ? "custom" : undefined} data-v8-root="" aria-busy={loading ? true : undefined}>
            <Room />
            {stage !== "idle" && (
              <div
                className={`${appStyles.swipePanel} ${s.panel} ${stage === "cover" ? appStyles.panelIn : appStyles.panelOut}`}
                onAnimationEnd={onPanelEnd}
                aria-hidden="true"
              />
            )}
            {/* inert under the menu, and under the boot overlay until it starts to dissolve */}
            <div ref={pagesRef} className={`${appStyles.pageTransition} ${s.pages}`} inert={menu || (loading && blocking) ? true : undefined}>
              <Routes location={displayLocation}>
                <Route index element={<Home />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="blog" element={<BlogPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:name" element={<ProjectPage />} />
                <Route path="alumni" element={<AlumniPage />} />
                <Route path="legacy" element={<LegacyToAlumni />} />
                <Route path="artwork" element={<ArtworkPage />} />
                <Route path="contactus" element={<ContactPage />} />
                <Route
                  path="archive"
                  element={
                    <Suspense fallback={null}>
                      <ArchivePage />
                    </Suspense>
                  }
                />
                <Route path="*" element={<Navigate to={P("/")} replace />} />
              </Routes>
            </div>
            {menu && <Menu closing={menu === "closing"} onClose={closeMenu} onClosed={onMenuClosed} returnFocus={menuFocus.current} />}
            {loading && <Boot onExit={onExit} onFinish={onFinish} />}
            {customCursor && <Cursor />}
          </div>
        </MarkProvider>
      </LightProvider>
    </ChromeContext.Provider>
  );
}
