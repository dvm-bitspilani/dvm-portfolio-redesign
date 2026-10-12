// V2 · Reframed — full site under /v/v2/*.
// Shell = the base App (original preloader, swipe-panel route transitions) plus two
// variant-wide pieces that outlive route changes: the live mercury brand mark (one
// WebGL context, docked in the navbar or posed by the home page / menu) and the menu.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import appStyles from "../../App.module.css";
import s from "./v2.module.css";

import Preloader from "./chrome/PreLoader";
import Menu from "./chrome/Menu";
import { MarkProvider } from "./chrome/mark";
import { ChromeContext } from "./chrome/shell";
import { P } from "./lib/paths";

import Home from "./home/Home";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import Team from "./base/Team";
import ProjectsPage from "./projects/ProjectsPage";
import ProjectPage from "./base/ProjectPage";
import ArtworkPage from "./base/ArtworkPage";
import ContactPage from "./pages/ContactPage";
import ArchivePage from "./pages/ArchivePage";
import LegacyPage from "./pages/LegacyPage";

const isHome = (pathname) => pathname.replace(/\/$/, "") === P("/");

export default function V2() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle"); // idle | cover | reveal
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [menu, setMenu] = useState(null); // null | "open" | "closing"
  const menuFocus = useRef(null);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) setStage("cover");
    else if (location.search !== displayLocation.search || location.state !== displayLocation.state) setDisplayLocation(location);
  }, [location, displayLocation]);

  // Navigating (from the menu or anywhere) closes the menu.
  useEffect(() => {
    setMenu((m) => (m === "open" ? "closing" : m));
  }, [location.pathname]);

  // New page under the panel: start at the top and re-measure every trigger.
  useLayoutEffect(() => {
    if (!displayLocation.state?.scrollTo) window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [displayLocation.pathname, displayLocation.state]);

  const onPanelEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (stage === "cover") {
      setDisplayLocation(location);
      setStage("reveal");
    } else if (stage === "reveal") setStage("idle");
  };

  const onExit = useCallback(() => setRevealed(true), []);
  const onFinish = useCallback(() => {
    setRevealed(true);
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
      <MarkProvider revealed={revealed} transitioning={stage !== "idle"} homeActive={isHome(location.pathname)}>
        <div className={s.root}>
          {stage !== "idle" && (
            <div
              className={`${appStyles.swipePanel} ${s.panel} ${stage === "cover" ? appStyles.panelIn : appStyles.panelOut}`}
              onAnimationEnd={onPanelEnd}
              aria-hidden="true"
            />
          )}
          <div className={appStyles.pageTransition} inert={menu ? true : undefined}>
            <Routes location={displayLocation}>
              <Route index element={<Home />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="team" element={<Team />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:name" element={<ProjectPage />} />
              <Route path="legacy" element={<LegacyPage />} />
              <Route path="artwork" element={<ArtworkPage />} />
              <Route path="contactus" element={<ContactPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route path="*" element={<Navigate to={P("/")} replace />} />
            </Routes>
          </div>
          {menu && <Menu closing={menu === "closing"} onClose={closeMenu} onClosed={onMenuClosed} returnFocus={menuFocus.current} />}
        </div>
      </MarkProvider>
      {loading && <Preloader waitForLoad onExit={onExit} onFinish={onFinish} />}
    </ChromeContext.Provider>
  );
}
