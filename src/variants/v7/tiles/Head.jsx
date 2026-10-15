// A tile's channel strip: status LED, label (the tile's heading), and a live readout.
import t from "./tiles.module.css";

export default function Head({ id, label, led = "idle", children, solid = false }) {
  return (
    <div className={t.head} data-solid={solid ? "" : undefined}>
      <span className={t.led} data-led={led} aria-hidden="true" />
      <h2 id={`v7-h-${id}`} className={t.label}>
        {label}
      </h2>
      {children != null && <span className={t.readout}>{children}</span>}
    </div>
  );
}
