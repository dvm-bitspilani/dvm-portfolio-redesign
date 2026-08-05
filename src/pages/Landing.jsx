import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import Navbar from "../components/Navbar";
import LandingPage from "../components/HomePage";
import Blog from "../components/Blog_Land";
import Legacy from "../components/Legacy";
import Ham from "../components/Ham";
import ProjectLanding from "./ProjectLanding";
import ContactUs from "./ContactUs";

const Landing = () => {
  const [isHamOpen, setIsHamOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const timeout = setTimeout(() => {
        const el = document.querySelector(location.hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [location]);

  return (
    <>
      <Navbar onHamClick={() => setIsHamOpen(true)} />

      <LandingPage />
      <Blog  onHamClick={() => setIsHamOpen(true)} />
      <Legacy />
      <ProjectLanding />
      <ContactUs />
      {isHamOpen && (
        <Ham onClose={() => setIsHamOpen(false)} />
      )}
    </>
  );
};

export default Landing;