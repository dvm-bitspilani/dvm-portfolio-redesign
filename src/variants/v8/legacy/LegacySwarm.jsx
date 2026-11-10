import { useEffect, useRef, useState } from "react";
import { SwarmField } from "../../../immersive/kit/swarm";
import { LEGACY_ACTIVE, LEGACY_BRIGHTNESS, LEGACY_FILL, LEGACY_PARALLAX, LEGACY_PLACE } from "../home/swarmChain";
import styles from "./LegacySwarm.module.css";

/** Phones: the band under the head, filled edge to edge. */
const BAND_FILL = 0.9;
/** Fewer, larger particles on phones read brighter; tone them down (idle / a company lit). */
const BAND_BRIGHTNESS = 0.32;
const BAND_ACTIVE = 0.28;

/**
 * Legacy's own swarm, for when it stands alone: the /legacy page, and the home page on phones,
 * with reduced motion or without WebGL2 (no pinned year-by-year stage to carry the mark into). On
 * the desktop home the section uses the swarm it shares with Year by year instead
 * (home/LegacyStory.jsx), which is given this same look while Legacy is on screen.
 * The DVM mark in particles, idling dim right of the constellation (`placement`: a region of the
 * section; LEGACY_PLACE by default) and a small step dimmer while a company is lit (`active`).
 * `band`: phones — the layer fills the band it sits in (Legacy's markBox). The cursor never moves
 * the dots. The WebGL field only exists while the section is near the viewport.
 *
 * @param {{ placement?: { x0: number, y0: number, x1: number, y1: number } | null, active?: boolean, band?: boolean, brightness?: number, fill?: number }} props
 */
export default function LegacySwarm({ placement, active = false, band = false, brightness: fixed, fill }) {
  const hostRef = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let off = 0;
    // mounts early as the section approaches from below, lets go once it has scrolled past
    const io = new IntersectionObserver(
      ([e]) => {
        window.clearTimeout(off);
        if (e.isIntersecting) setNear(true);
        else off = window.setTimeout(() => setNear(false), 300);
      },
      { rootMargin: "0px 0px 50% 0px" },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(off);
      io.disconnect();
    };
  }, []);

  const brightness = fixed ?? (band ? (active ? BAND_ACTIVE : BAND_BRIGHTNESS) : active ? LEGACY_ACTIVE : LEGACY_BRIGHTNESS);

  return (
    <div ref={hostRef} className={styles.layer} aria-hidden="true">
      {near && (
        <SwarmField
          target="logo"
          placement={band ? "full" : (placement ?? LEGACY_PLACE)}
          fill={fill ?? (band ? BAND_FILL : LEGACY_FILL)}
          background="transparent"
          brightness={brightness}
          parallax={LEGACY_PARALLAX}
          holdToAttract={false}
          ignoreCursor
          cursorRing={false}
        />
      )}
    </div>
  );
}
