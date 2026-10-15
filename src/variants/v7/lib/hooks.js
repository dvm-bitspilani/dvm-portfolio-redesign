import { useEffect, useRef, useState } from "react";

export function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [query]);
  return match;
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
export const MOBILE_Q = "(max-width: 760px)";
export const useMobile = () => useMedia(MOBILE_Q);

/** Re-renders every `ms` while the tab is visible (live readouts). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id = 0;
    const start = () => {
      clearInterval(id);
      setNow(Date.now());
      // align ticks to the wall clock so seconds don't drift against each other
      const tick = () => setNow(Date.now());
      id = window.setInterval(tick, ms);
    };
    const onVis = () => (document.hidden ? clearInterval(id) : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms]);
  return now;
}

/** True while the element is (near) on screen. */
export function useVisible(ref, margin = "0px") {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return vis;
}

export function useLatest(value) {
  const r = useRef(value);
  r.current = value;
  return r;
}
