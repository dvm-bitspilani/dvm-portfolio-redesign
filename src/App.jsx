import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Land from "./pages/Landing";
import ScrollToTop from "./components/ScrollToTop";
import Blog from "./pages/Blog";
import Ham from "./components/Ham";
import About from "./components/About";
import styles from "./App.module.css";

import ContactUs from "./pages/ContactUs";
const App = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  const [displayLocation, setDisplayLocation] = useState(location);

  // "idle" -> no animation class at all (this is the resting state)
  // "fadeOut" -> outgoing page blurring/shrinking away
  // "fadeIn" -> incoming page blurring/growing into place
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

  // Only react to the wrapper's own animation finishing, not anything
  // bubbling up from children (Ham's segment/label animations, etc.).
  const handleAnimationEnd = (e) => {
    if (e.target !== e.currentTarget) return;

    if (stage === "fadeOut") {
      setDisplayLocation(location);
      setStage("fadeIn");
    } else if (stage === "fadeIn") {
      // Critical: drop the animation class entirely once it's done.
      // animation-fill-mode: both otherwise leaves transform/filter
      // "active" on this wrapper forever (even at resting values like
      // scale(1) / blur(0)), which creates a containing block that
      // traps any position: fixed descendant — e.g. Navbar — inside
      // this wrapper instead of the viewport.
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
      </Routes>
      </div>
    </>
  );
};

export default App;