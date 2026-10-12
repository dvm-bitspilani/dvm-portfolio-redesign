import { useMemo } from "react";
import { Link } from "react-router-dom";
import About from "../../../components/About";
import { FoldTimeline, buildArchiveStops } from "../../../immersive/kit/timeline";
import V3Nav from "../shell/V3Nav";
import s from "./about.module.css";

/**
 * The redesign's About page, followed by the paper mark: it unfolds into
 * every dated project and essay, year by year.
 */
export default function AboutPage() {
  const stops = useMemo(() => buildArchiveStops(), []);
  return (
    <div className={s.page}>
      <V3Nav />
      <About />
      <FoldTimeline
        items={stops}
        tone="teal"
        title="Everything we shipped, year by year"
        intro={
          <div className={s.intro}>
            <h2 className={s.h}>Year by year</h2>
            <p>
              Every dated project and essay, stamped on one strip of paper. Scroll to unfold it, then follow the threads to each piece.
            </p>
            <Link to="/archive" className={s.link}>
              See it all on the archive wall
            </Link>
          </div>
        }
      />
    </div>
  );
}
