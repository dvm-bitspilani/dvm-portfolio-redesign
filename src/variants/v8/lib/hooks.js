import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useState } from "react";

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

/**
 * Mounts heavy children (WebGL) only while the box is within `margin` (an IntersectionObserver
 * rootMargin) of the viewport, and unmounts them again once it is outside it.
 */
export function useNear(ref, margin = "100% 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}

/**
 * The base sections create ScrollTriggers in effects without cleanup; once the page
 * unmounts they linger on detached nodes (and warn on every refresh). Kill every trigger
 * that lives inside `ref` when the component unmounts.
 */
export function useKillTriggersOnUnmount(ref) {
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (!el) return;
      ScrollTrigger.getAll().forEach((st) => {
        const t = st.trigger;
        if (t && (t === el || el.contains(t))) {
          st.animation?.kill();
          st.kill();
        }
      });
    };
  }, [ref]);
}

/** Like useNear, but latches: mounts heavy content once it comes close and keeps it (no layout jumps). */
export function useOnceNear(ref, margin = "60% 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
