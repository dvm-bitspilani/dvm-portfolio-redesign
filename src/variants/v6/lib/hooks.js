import { createContext, useContext, useEffect, useState } from "react";

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
export const useCompact = () => useMedia("(max-width: 820px)");

/** Variant-wide state: the graph, the resolved focus and the graph API (preview/zoom). */
export const ShellContext = createContext(null);
export const useShell = () => useContext(ShellContext);
