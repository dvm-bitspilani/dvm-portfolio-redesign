// V8 home: one projector session in one room. Hero (the hologram → docks in the nav) → About
// DVM (who we are, second) → Selected work (the portfolio, on a sideways strip of film under the
// projector's spotlight; the five teams' strip is on /about) → Legacy (alumni over the dots) →
// Year by year (the same dots glide on and settle into the paper strip that unfolds, latest year
// first; one swarm for both, LegacyStory) → the archive (the mark drawn as a line over the fading
// strip becomes the wall) → Contact, with the footer.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../chrome/Navbar";
import Hero from "./Hero";
import About from "./About";
import Work from "./Work";
import LegacyStory from "./LegacyStory";
import ArchiveEnd from "./ArchiveEnd";
import Contact from "../contact/Contact";

export default function Home() {
  const location = useLocation();

  // Arrived wanting a section (e.g. /v/v8#about, or state.scrollTo).
  useEffect(() => {
    const id = location.state?.scrollTo || location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 350);
    return () => clearTimeout(t);
  }, [location]);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Work />
        <LegacyStory />
        <ArchiveEnd />
        <Contact />
      </main>
    </>
  );
}
