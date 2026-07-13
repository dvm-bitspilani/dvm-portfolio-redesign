import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Land from "./pages/Landing";
import ScrollToTop from "./components/ScrollToTop";
import Blog from "./pages/Blog";
import Ham from "./components/Ham";
import About from "./components/About";
import styles from "./App.module.css";

const App = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fadeIn");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("fadeOut");
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = (e) => {
    if (e.target !== e.currentTarget) return;

    if (transitionStage === "fadeOut") {
      setDisplayLocation(location);
      setTransitionStage("fadeIn");
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

  return (
    <>
      <ScrollToTop />
      <div
        className={`${styles.pageTransition} ${styles[transitionStage]}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<Land />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/ham" element={<Ham />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </>
  );
};

export default App;