// A film leader for a frame with no picture (the four projects without a cover): two rings, a
// hairline crosshair and a teal sweep counting down, the title under the rings. Decorative: the
// card or page around it already carries the title.
import p from "../projects.module.css";

export default function Leader({ title }) {
  return (
    <span className={p.leader} aria-hidden="true">
      <span className={p.leaderCross} />
      <span className={`${p.leaderRing} ${p.leaderRingOuter}`} />
      <span className={`${p.leaderRing} ${p.leaderRingInner}`} />
      <span className={p.leaderHand} />
      {title && (
        <span className={p.leaderTitle}>
          <span>{title}</span>
        </span>
      )}
    </span>
  );
}
