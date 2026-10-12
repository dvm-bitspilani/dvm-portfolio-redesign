import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AsciiBoot } from "../../immersive/kit/ascii";
import { V3Router, BootContext, V3_BASE } from "./shell/context";
import Home from "./home/Home";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import TeamPage from "./pages/TeamPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetail from "./pages/ProjectDetail";
import ArtworkPage from "./pages/ArtworkPage";
import ContactPage from "./pages/ContactPage";
import s from "./shell/shell.module.css";

// The archive wall is the heaviest page; keep it out of the first chunk.
const ArchivePage = lazy(() => import("./pages/ArchivePage"));

/** Strip the /v/v3 prefix so route logic matches the base app's paths. */
const local = (pathname) => pathname.slice(V3_BASE.length) || "/";

function Shell() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle"); // idle | cover | reveal
  const [boot, setBoot] = useState("booting"); // booting | done
  const [bootExit] = useState(() => (local(location.pathname) === "/" ? "fade" : "power-off"));

  // The redesign's swipe transition: cover, swap the route underneath, reveal.
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) setStage("cover");
    else if (location.key !== displayLocation.key) setDisplayLocation(location);
  }, [location, displayLocation]);

  const onPanelEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (stage === "cover") {
      setDisplayLocation(location);
      window.scrollTo(0, 0);
      setStage("reveal");
    } else if (stage === "reveal") setStage("idle");
  };

  return (
    <BootContext.Provider value={boot}>
      <div className={s.root} data-v3-root="">
        {boot === "booting" && (
          <AsciiBoot
            once="imm-v3-boot"
            waitForLoad
            maxWait={3}
            exit={bootExit}
            onDone={() => setBoot("done")}
          />
        )}

        {stage !== "idle" && (
          <div
            className={`${s.swipe} ${stage === "cover" ? s.swipeIn : s.swipeOut}`}
            onAnimationEnd={onPanelEnd}
            aria-hidden="true"
          />
        )}

        <Suspense fallback={<div className={s.fallback} />}>
          <Routes location={displayLocation}>
            <Route index element={<Home />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:name" element={<ProjectDetail />} />
            <Route path="artwork" element={<ArtworkPage />} />
            <Route path="contactus" element={<ContactPage />} />
            <Route path="archive" element={<ArchivePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BootContext.Provider>
  );
}

export default function V3() {
  return (
    <V3Router>
      <Shell />
    </V3Router>
  );
}
