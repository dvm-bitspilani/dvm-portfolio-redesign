// V2 · Reframed — full site under /v/v2/*.
// Same shell as the base App (swipe-panel route transitions), with variant routes.
import { useEffect, useLayoutEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import appStyles from "../../App.module.css";
import s from "./v2.module.css";

import Home from "./home/Home";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import Team from "./base/Team";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectPage from "./base/ProjectPage";
import ArtworkPage from "./base/ArtworkPage";
import ContactPage from "./pages/ContactPage";
import ArchivePage from "./pages/ArchivePage";

export default function V2() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle"); // idle | cover | reveal

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) setStage("cover");
    else if (location.search !== displayLocation.search || location.state !== displayLocation.state) setDisplayLocation(location);
  }, [location, displayLocation]);

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

  return (
    <div className={s.root}>
      {stage !== "idle" && (
        <div
          className={`${appStyles.swipePanel} ${s.panel} ${stage === "cover" ? appStyles.panelIn : appStyles.panelOut}`}
          onAnimationEnd={onPanelEnd}
          aria-hidden="true"
        />
      )}
      <div className={appStyles.pageTransition}>
        <Routes location={displayLocation}>
          <Route index element={<Home />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="team" element={<Team />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:name" element={<ProjectPage />} />
          <Route path="artwork" element={<ArtworkPage />} />
          <Route path="contactus" element={<ContactPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="*" element={<Navigate to="/v/v2" replace />} />
        </Routes>
      </div>
    </div>
  );
}
