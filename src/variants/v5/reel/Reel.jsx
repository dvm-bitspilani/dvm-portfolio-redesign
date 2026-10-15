// <Reel> = one page of the site as a strip of film. Desktop: a fixed gate the strip
// travels through sideways (the bus moves the track). Phone: the same frames stacked
// vertically in a native scroll container that snaps one frame per swipe.
import { useLayoutEffect, useRef } from "react";
import { useBus } from "./context";
import { useNative } from "../lib/hooks";
import s from "./reel.module.css";

const railTile = (bottom) => {
  const y = bottom ? 20 : 7;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='38'><path fill-rule='evenodd' fill='%230e171b' d='M0 0h32v38H0z M12.5 ${y}h7a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-7a2.5 2.5 0 0 1-2.5-2.5v-6a2.5 2.5 0 0 1 2.5-2.5z'/><rect x='10.4' y='${y + 0.4}' width='11.2' height='10.2' rx='2.3' fill='none' stroke='%235fd4e6' stroke-opacity='.4' stroke-width='.8'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
};
const railTileV = (right) => {
  const x = right ? 13 : 4;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='28'><path fill-rule='evenodd' fill='%230e171b' d='M0 0h26v28H0z M${x + 2} 9h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
};
const RAILS = { top: railTile(false), bottom: railTile(true), left: railTileV(false), right: railTileV(true) };

export function Reel({ label, at, children, tail = true }) {
  const bus = useBus();
  const native = useNative();
  const vp = useRef(null);
  const track = useRef(null);

  useLayoutEffect(() => {
    bus.attach(vp.current, track.current, { mode: native ? "native" : "travel" });
    return () => bus.detach();
  }, [bus, native]);

  useLayoutEffect(() => {
    if (at) bus.goToId(at, { instant: true });
  }, [bus, at, native]);

  return (
    <div ref={vp} className={`${s.viewport} ${native ? s.native : s.travel}`} aria-label={label} role="region" aria-roledescription="film reel">
      <div className={s.weave}>
        <div ref={track} className={s.track}>
          {native ? (
            <>
              <span className={`${s.rail} ${s.railL}`} style={{ backgroundImage: RAILS.left }} aria-hidden="true" />
              <span className={`${s.rail} ${s.railR}`} style={{ backgroundImage: RAILS.right }} aria-hidden="true" />
            </>
          ) : (
            <>
              <span className={`${s.rail} ${s.railT}`} style={{ backgroundImage: RAILS.top }} aria-hidden="true" />
              <span className={`${s.rail} ${s.railB}`} style={{ backgroundImage: RAILS.bottom }} aria-hidden="true" />
            </>
          )}
          {children}
          {tail && (
            <div className={s.tail} aria-hidden="true">
              <span>End of reel</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One frame of film. `w` = width in viewport widths ×100 on desktop (or "auto" to hug
 * its content). `spot` = "x,y" (0..1 in the frame) where the projector light lands.
 */
export function Frame({ id, chapter, label, w = 100, spot, thumb, edge, className = "", gateClass = "", children, frameRef, as: Tag = "section", ...rest }) {
  const style = w === "auto" ? undefined : { "--w": w };
  return (
    <Tag
      ref={frameRef}
      data-frame=""
      data-id={id}
      data-chapter={chapter || undefined}
      data-label={label}
      data-spot={spot}
      data-thumb={thumb}
      data-edge={edge || label || ""}
      className={`${s.frame} ${w === "auto" ? s.auto : ""} ${className}`}
      style={style}
      aria-label={label}
      {...rest}
    >
      <div className={`${s.gate} ${gateClass}`}>{children}</div>
    </Tag>
  );
}
