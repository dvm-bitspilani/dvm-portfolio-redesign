import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Land from "./pages/Landing";
import ScrollToTop from "./components/ScrollToTop";
import Blog from "./pages/Blog";
import About from "./components/About";
import TeamPage from "./components/Team";
import ContactUs from "./pages/ContactUs";
import Preloader from "./components/PreLoader";
import Projects from "./pages/Projects";
import ProjectPage from "./components/Project/ProjectPage";
import ArtworkPage from "./pages/ArtworkPage";

import styles from "./App.module.css";

const App = () => {
  const [initialLoading, setInitialLoading] = useState(true);
  const location = useLocation();

  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle"); // idle | cover | reveal

  // Route changed: bring the swipe panel in to cover the screen.
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setStage("cover");
    }
  }, [location, displayLocation]);

  const handlePanelEnd = (e) => {
    if (e.target !== e.currentTarget) return;

    if (stage === "cover") {
      // Screen is fully covered — swap the route underneath, then reveal.
      setDisplayLocation(location);
      setStage("reveal");
    } else if (stage === "reveal") {
      setStage("idle");
    }
  };

  if (initialLoading) {
    return (
      <Preloader onFinish={() => setInitialLoading(false)} waitForLoad />
    );
  }

  return (
    <>
      <ScrollToTop />

      {stage !== "idle" && (
        <div
          className={`${styles.swipePanel} ${
            stage === "cover" ? styles.panelIn : styles.panelOut
          }`}
          onAnimationEnd={handlePanelEnd}
          aria-hidden="true"
        />
      )}

      <div className={styles.pageTransition}>
        <Routes location={displayLocation}>
          <Route path="/" element={<Land />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/about" element={<About />} />
          <Route path="/contactus" element={<ContactUs />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:name" element={<ProjectPage />} />
          <Route path="/artwork" element={<ArtworkPage />} />
        </Routes>
      </div>
    </>
  );
};

export default App;