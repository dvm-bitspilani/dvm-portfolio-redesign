import { useEffect, useRef, useState } from "react";
import { SwarmField } from "../../../immersive/kit/swarm";
import styles from "./LegacySwarm.module.css";

// Legacy circle keys → the company each one stands for.
const NAMES = {
  google: "GOOGLE",
  microsoft: "MICROSOFT",
  meta: "META",
  imc: "IMC",
  img1: "IMC",
  img2: "GOOGLE",
  img3: "META",
};

// Behind the alumni graph, below the LEGACY title.
const PLACE = { x0: 0.18, y0: 0.24, x1: 0.82, y1: 0.98 };
const PLACE_NARROW = { x0: 0.04, y0: 0.3, x1: 0.96, y1: 0.86 };
const placement = (w) => (w < 760 ? PLACE_NARROW : PLACE);

/**
 * Ambient swarm layer for the Legacy section: the DVM mark in particles behind
 * the alumni graph; hovering a company re-forms it into the company's name.
 * The WebGL field only exists while the section is near the viewport, so the
 * home page never holds more than the mercury hero + one other context live.
 */
export default function LegacySwarm({ activeKey }) {
  const hostRef = useRef(null);
  const swarmRef = useRef(null);
  const [near, setNear] = useState(false);
  // fewer, larger particles on phones read brighter; tone them down
  const [narrow] = useState(() => window.innerWidth < 760);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let off = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        window.clearTimeout(off);
        if (e.isIntersecting) setNear(true);
        else off = window.setTimeout(() => setNear(false), 1200);
      },
      { rootMargin: "50% 0px 50% 0px" },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(off);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const swarm = swarmRef.current;
    if (!swarm) return;
    const name = activeKey && NAMES[activeKey];
    if (name) void swarm.override({ text: name }, { placement, fill: 0.86, kick: 0.6 });
    else swarm.clearOverride();
  }, [activeKey, near]);

  return (
    <div ref={hostRef} className={styles.layer} aria-hidden="true">
      {near && (
        <SwarmField
          ref={swarmRef}
          target="logo"
          placement={placement}
          fill={0.92}
          background="transparent"
          brightness={narrow ? 0.32 : 0.5}
          parallax={0.25}
          holdToAttract={false}
          cursorRing={false}
        />
      )}
    </div>
  );
}
