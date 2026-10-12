import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { FoldTimeline, buildArchiveStops, buildMilestoneStops } from "../../../immersive/kit/timeline";
import { vp } from "../paths";
import styles from "./HistoryTimeline.module.css";

/** Internal hrefs from the kit's data helpers ("/projects/12", "/team") → inside the variant. */
const localize = (stops) =>
  stops.map((s) => ({
    ...s,
    entries: s.entries.map((e) => (e.href && e.href.startsWith("/") ? { ...e, href: vp(e.href) } : e)),
  }));

const COPY = {
  history: {
    heading: "OUR STORY",
    title: "Our story, year by year",
    body: "Every fest theme, every first and every batch since the department began, on one strip of paper.",
  },
  archive: {
    heading: "YEAR BY YEAR",
    title: "Everything DVM has shipped, year by year",
    body: "Each site, app, film and essay we have made, laid out year by year on one strip of paper.",
  },
};

/**
 * The origami strip as the Legacy / history story: folded DVM mark that opens
 * into a teal-foil timeline, pinned with ScrollTrigger (no sticky; the base's
 * global `* { overflow-x: hidden }` breaks it).
 */
export default function HistoryTimeline({ set = "history", id }) {
  const ref = useRef(null);
  const items = useMemo(
    () => localize(set === "archive" ? buildArchiveStops() : buildMilestoneStops()),
    [set],
  );
  const copy = COPY[set];

  return (
    <div className={styles.wrap} id={id}>
      <FoldTimeline
        ref={ref}
        items={items}
        tone="teal"
        startFolded
        background="standalone"
        height={0.75}
        unfoldLength={1.4}
        title={copy.title}
        intro={
          <div className={styles.intro}>
            <h2 className={styles.heading}>
              <span className={styles.fill}>{copy.heading}</span>
              <span className={styles.outline} aria-hidden="true">
                {copy.heading}
              </span>
            </h2>
            <p className={styles.body}>{copy.body}</p>
            <Link className={styles.archiveLink} to={vp("/archive")}>
              Open the archive
            </Link>
          </div>
        }
      />
    </div>
  );
}
