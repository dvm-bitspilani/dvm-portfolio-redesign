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

export const NATIVE_QUERY = "(max-width: 768px)";
export const useNative = () => useMedia(NATIVE_QUERY);
export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");

