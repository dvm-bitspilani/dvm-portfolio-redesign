import { useState } from "react";
import Navbar from "../components/Navbar";
import Ham from "../components/Ham";
import About from "../components/About";
import HistoryTimeline from "../components/HistoryTimeline";

/** /about: the base About section, followed by the origami strip of everything shipped. */
export default function AboutPage() {
  const [isHamOpen, setIsHamOpen] = useState(false);
  return (
    <>
      <Navbar onHamClick={() => setIsHamOpen(true)} />
      <About />
      <HistoryTimeline set="archive" id="years" />
      {isHamOpen && <Ham onClose={() => setIsHamOpen(false)} />}
    </>
  );
}
