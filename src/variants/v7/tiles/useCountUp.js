import { useEffect, useState } from "react";

/** 0 → value once, ease-out-expo; instant with reduced motion. */
export function useCountUp(value, { duration = 1600, delay = 0 } = {}) {
  const [v, setV] = useState(() => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? value : 0));
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(value);
      return;
    }
    let raf = 0;
    let t0 = 0;
    const step = (now) => {
      if (!t0) t0 = now + delay;
      const k = Math.max(0, Math.min(1, (now - t0) / duration));
      const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      setV(Math.round(value * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay]);
  return v;
}
