import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../chrome/Navbar";
import Ham from "../chrome/Ham";
import MarkStage from "./MarkStage";
import TimelineSection from "./TimelineSection";
import ProjectsSection from "./ProjectsSection";
import ArchiveTeaser from "./ArchiveTeaser";
import Blog_Land from "../base/Blog_Land";
import Legacy from "../../../components/Legacy";
import Terminal from "../contact/Terminal";
import s from "../chrome/chrome.module.css";

export default function Home() {
  const [hamOpen, setHamOpen] = useState(false);
  const [ascii, setAscii] = useState(false);
  const location = useLocation();

  // Arrived from the menu wanting a section (e.g. /#about, /#legacy).
  useEffect(() => {
    const id = location.state?.scrollTo || location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 350);
    return () => clearTimeout(t);
  }, [location]);

  return (
    <>
      <Navbar onHamClick={() => setHamOpen(true)}>
        <button
          type="button"
          className={s.asciiToggle}
          aria-pressed={ascii}
          title="Swap the hero mark between liquid mercury and ASCII"
          onClick={() => setAscii((a) => !a)}
        >
          {ascii ? "Mercury" : "ASCII"}
        </button>
      </Navbar>
      <main>
        <MarkStage ascii={ascii} />
        <TimelineSection tone="copper" />
        <Blog_Land />
        <Legacy />
        <ProjectsSection />
        <Terminal id="contact" />
        <ArchiveTeaser />
      </main>
      {hamOpen && <Ham onClose={() => setHamOpen(false)} />}
    </>
  );
}
