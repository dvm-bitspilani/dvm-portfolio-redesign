// /legacy: the Legacy section (alumni graph over the particle swarm, as in V1) followed by
// the origami strip that unfolds into everything DVM has shipped, year by year (moved
// here from the home page), then the door to the Archive.
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { FoldTimeline } from "../../../immersive/kit/timeline";
import Navbar from "../chrome/Navbar";
import Legacy from "../legacy/Legacy";
import ArchiveTeaser from "../home/ArchiveTeaser";
import { scopedArchiveStops, useScopedSelect } from "../lib/timeline";
import { P } from "../lib/paths";
import { useOnceNear } from "../lib/hooks";
import sec from "../home/sections.module.css";
import s from "./pages.module.css";

export default function LegacyPage() {
  const items = useMemo(scopedArchiveStops, []);
  const onSelect = useScopedSelect();
  // the strip is its own WebGL context: create it only as the reader approaches, so the
  // page never holds the docked mark + swarm + strip at once
  const tlRef = useRef(null);
  const tlNear = useOnceNear(tlRef, "80% 0px");
  return (
    <>
      <Navbar />
      <main className={s.legacyPage}>
        <h1 className={s.srOnly}>Our legacy</h1>
        <Legacy fullLink={false} id="legacy" />
        <section ref={tlRef} id="year-by-year" className={`${sec.timeline} ${s.tlSlot}`} aria-label="DVM, year by year">
          {tlNear && (
          <FoldTimeline
            items={items}
            tone="teal"
            title="Everything DVM has shipped, year by year"
            onSelect={onSelect}
            intro={
              <div className={sec.timelineIntro}>
                <h2>Year by year</h2>
                <p>The mark is one strip of folded paper. Keep scrolling and it unfolds into every site, app, film and essay we have shipped, one crease at a time.</p>
                <p className={s.tlLinks}>
                  <Link to={P("/projects")} className={sec.pill}>All projects</Link>
                  <Link to={P("/archive")} className={s.tlLink}>Open the archive</Link>
                </p>
              </div>
            }
          />
          )}
        </section>
        <ArchiveTeaser />
      </main>
    </>
  );
}
