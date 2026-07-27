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



import styles from "./App.module.css";

const App = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle");


  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setStage("fadeOut");
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = (e) => {
    if (e.target !== e.currentTarget) return;

    if (stage === "fadeOut") {
      setDisplayLocation(location);
      setStage("fadeIn");
    } else if (stage === "fadeIn") {
      setStage("idle");
    }
  };

  if (loading) {
    return <Preloader onFinish={() => setLoading(false)} />;
  }

  const stageClass =
    stage === "fadeOut"
      ? styles.fadeOut
      : stage === "fadeIn"
      ? styles.fadeIn
      : "";

  return (
    <>
      <ScrollToTop />

      <div
        className={`${styles.pageTransition} ${stageClass}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<Land />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/about" element={<About />} />
          <Route path="/contactus" element={<ContactUs />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:name" element={<ProjectPage />} />
        </Routes>
      </div>
    </>
  );
};

export default App;