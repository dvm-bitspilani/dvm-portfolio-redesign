import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../chrome/Navbar";
import MarkStage from "./MarkStage";
import ArchiveTeaser from "./ArchiveTeaser";
import Blog_Land from "../base/Blog_Land";
import Legacy from "../legacy/Legacy";
import ProjectLanding from "../projects/ProjectLanding";
import Terminal from "../contact/Terminal";

export default function Home() {
  const location = useLocation();

  // Arrived wanting a section (e.g. /v/v2#about, /v/v2#legacy, or state.scrollTo).
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
        <MarkStage />
        <Blog_Land />
        <Legacy />
        <ProjectLanding />
        <Terminal id="contact" />
        <ArchiveTeaser />
      </main>
    </>
  );
}
