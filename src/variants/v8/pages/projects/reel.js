// The /projects hero reel's state (Gate.jsx › ReelGate draws it).
import { useCallback, useState } from "react";

/** The reel's state: the current and previous still, how far the film has advanced (rails) and a
 *  key that restarts the timer. */
export function useReel(n) {
  const [st, setSt] = useState({ cur: 0, prev: -1, adv: 0, step: 0 });
  const select = useCallback(
    (i) =>
      setSt((s) => ({
        cur: i,
        prev: i === s.cur ? s.prev : s.cur,
        adv: i === s.cur ? s.adv : s.adv + 1,
        step: s.step + 1,
      })),
    [],
  );
  const next = useCallback(() => setSt((s) => ({ cur: (s.cur + 1) % n, prev: s.cur, adv: s.adv + 1, step: s.step + 1 })), [n]);
  return { ...st, select, next };
}
