// Head and tail of every inner reel: the reel's title card and the "next reel" card.
import { Link } from "react-router-dom";
import { Frame } from "../reel/Reel";
import { ChapterCard } from "./pieces";
import { REELS, reelHref } from "../lib/reels";
import f from "./frames.module.css";
import e from "./ends.module.css";

export function TitleCard({ n, title, line, id = "title", w = 70, children }) {
  return (
    <ChapterCard id={id} n={n} title={title} line={line} w={w} kind="Reel">
      {children}
    </ChapterCard>
  );
}

export function NextReel({ n, id = "next" }) {
  const next = REELS.find((r) => r.n === n) || REELS[0];
  return (
    <Frame id={id} chapter="Next" label={`Next reel: ${next.name}`} w={56} edge="RUNOUT">
      <div className={e.next}>
        <p className={e.nextKicker}>Next reel</p>
        <p className={e.nextName}>{next.name}</p>
        <p className={e.nextText}>{next.blurb}</p>
        <Link to={reelHref(next)} className={f.pill}>
          Change reels
        </Link>
      </div>
    </Frame>
  );
}

/** Filter chips for a title card (links, so filters are deep-linkable and keyboard friendly). */
export function Chips({ items, active, label }) {
  return (
    <nav className={e.chips} aria-label={label}>
      {items.map((it) => (
        <Link key={it.id} to={it.to} replace className={e.chip} aria-current={it.id === active ? "true" : undefined}>
          {it.label}
          {it.count != null && <span className={e.count}>{it.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** A small year marker between groups of frames. */
export function YearCard({ year, count }) {
  return (
    <Frame id={`y${year}`} chapter={String(year)} label={String(year)} w={22} edge={String(year)}>
      <div className={e.year}>
        <p className={e.yearNum}>{year}</p>
        {count != null && <p className={e.yearCount}>{count} on this reel</p>}
      </div>
    </Frame>
  );
}
