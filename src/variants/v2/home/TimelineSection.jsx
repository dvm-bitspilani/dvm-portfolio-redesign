// Origami timeline on home: the paper DVM strip unfolds into the archive, year by year.
import { useMemo } from "react";
import { FoldTimeline } from "../../../immersive/kit/timeline";
import { scopedArchiveStops, useScopedSelect } from "../lib/timeline";
import s from "./sections.module.css";

export default function TimelineSection({ tone = "copper" }) {
  const items = useMemo(scopedArchiveStops, []);
  const onSelect = useScopedSelect();
  return (
    <section id="timeline" className={s.timeline} aria-label="DVM, year by year">
      <FoldTimeline
        items={items}
        tone={tone}
        title="DVM, year by year"
        onSelect={onSelect}
        intro={
          <div className={s.timelineIntro}>
            <h2>Year by year</h2>
            <p>The mark is one strip of folded paper. Keep scrolling and it unfolds into everything we have shipped, one crease at a time.</p>
          </div>
        }
      />
    </section>
  );
}
