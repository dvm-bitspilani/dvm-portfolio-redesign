import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AsciiBoot } from "../../immersive/kit/ascii";

import Land from "./pages/Landing";
import Blog from "./pages/Blog";
import AboutPage from "./pages/AboutPage";
import TeamPage from "./components/Team";
import ContactUs from "./pages/ContactUs";
import Projects from "./pages/Projects";
import ProjectPage from "./components/Project/ProjectPage";
import ArtworkPage from "./pages/ArtworkPage";
import ScrollToTop from "../../components/ScrollToTop";
import { BootContext, hasBooted, markBooted } from "./boot";
import { vp } from "./paths";

import v1 from "./v1.module.css";

const ArchivePage = lazy(() => import("./pages/ArchivePage"));

/**
 * V1 · Faithful — the redesign's App with two swaps:
 *  - PreLoader → AsciiBoot (the app is rendered underneath, so the CRT
 *    power-off reveals the hero and hands off to the mercury mark);
 *  - an /archive route.
 * The swipe page transition is unchanged.
 */
export default function V1App() {
  const [booting, setBooting] = useState(() => !hasBooted());
  const [revealed, setRevealed] = useState(() => hasBooted());
  const location = useLocation();

  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle"); // idle | cover | reveal

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setStage("cover");
    } else if (location !== displayLocation && stage === "idle") {
      // same page, new search/hash/state (archive filters, ?item=…): no swipe
      setDisplayLocation(location);
    }
  }, [location, displayLocation, stage]);

  const handlePanelEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (stage === "cover") {
      setDisplayLocation(location);
      setStage("reveal");
    } else if (stage === "reveal") {
      setStage("idle");
    }
  };

  const onExit = useCallback(() => {
    markBooted();
    setRevealed(true);
  }, []);
  const onDone = useCallback(() => {
    markBooted();
    setRevealed(true);
    setBooting(false);
  }, []);

  const boot = useMemo(() => ({ revealed }), [revealed]);

  return (
    <BootContext.Provider value={boot}>
      <ScrollToTop />
      {booting && <AsciiBoot waitForLoad maxWait={4} onExit={onExit} onDone={onDone} />}

      {stage !== "idle" && (
        <div
          className={`${v1.swipePanel} ${stage === "cover" ? v1.panelIn : v1.panelOut}`}
          onAnimationEnd={handlePanelEnd}
          aria-hidden="true"
        />
      )}

      <div className={`${v1.pageTransition} ${v1.root}`}>
        <Routes location={displayLocation}>
          <Route index element={<Land />} />
          <Route path="blog" element={<Blog />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contactus" element={<ContactUs />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:name" element={<ProjectPage />} />
          <Route path="artwork" element={<ArtworkPage />} />
          <Route
            path="archive"
            element={
              <Suspense fallback={<div className={v1.archiveFallback} />}>
                <ArchivePage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to={vp("/")} replace />} />
        </Routes>
      </div>
    </BootContext.Provider>
  );
}
