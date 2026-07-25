import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Land from "./pages/Landing";
import ScrollToTop from "./components/ScrollToTop";
import Blog from "./pages/Blog";
import Ham from "./components/Ham";
import About from "./components/About";
import styles from "./App.module.css";
import TeamPage from "./components/Team";

import ContactUs from "./pages/ContactUs";
const App = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const [displayLocation, setDisplayLocation] = useState(location);

  const [stage, setStage] = useState("idle");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

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
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
          color: "#fff",
          fontSize: "2rem",
          fontWeight: "bold",
        }}
      >
        Loading...
      </div>
    );
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
          <Route path="/ham" element={<Ham />} />
          <Route path="/about" element={<About />} />
          <Route path="/contactus" element={<ContactUs />} />
          <Route path="/team" element={<TeamPage />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
